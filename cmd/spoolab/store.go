package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"

	"github.com/torbenconto/bambulabs_api"
)

type StoredPrinter struct {
	ID               string  `json:"id"`
	Host             string  `json:"host"`
	AccessCode       string  `json:"access_code"`
	SerialNumber     string  `json:"serial_number"`
	Model            string  `json:"model,omitempty"`
	MachinePrice     float64 `json:"machine_price,omitempty"`     // preço de compra (para depreciação)
	MachineLifeHours float64 `json:"machine_life_hours,omitempty"` // vida útil em horas
	CostPerHour      float64 `json:"cost_per_hour,omitempty"`      // custo operação (energia + filamento) por hora
}

type PrinterStore struct {
	mu       sync.RWMutex
	items    map[string]*StoredPrinter
	printer  map[string]*bambulabs_api.Printer
	filePath string
}

func NewPrinterStore() *PrinterStore {
	dir, _ := os.UserConfigDir()
	if dir == "" {
		dir = "."
	}
	path := filepath.Join(dir, "spoolab", "printers.json")
	return &PrinterStore{
		items:    make(map[string]*StoredPrinter),
		printer:  make(map[string]*bambulabs_api.Printer),
		filePath: path,
	}
}

func (s *PrinterStore) Add(cfg StoredPrinter) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if cfg.ID == "" {
		cfg.ID = cfg.SerialNumber
	}
	s.items[cfg.ID] = &cfg
}

func (s *PrinterStore) Remove(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.items, id)
	if p, ok := s.printer[id]; ok {
		_ = p.Disconnect()
		delete(s.printer, id)
	}
}

func (s *PrinterStore) Get(id string) (*StoredPrinter, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	p, ok := s.items[id]
	return p, ok
}

func (s *PrinterStore) UpdateModel(id string, model string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	p, ok := s.items[id]
	if !ok {
		return false
	}
	p.Model = model
	return true
}

func (s *PrinterStore) UpdateAnalytics(id string, machinePrice, machineLifeHours, costPerHour float64) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	p, ok := s.items[id]
	if !ok {
		return false
	}
	p.MachinePrice = machinePrice
	p.MachineLifeHours = machineLifeHours
	p.CostPerHour = costPerHour
	return true
}

func (s *PrinterStore) List() []StoredPrinter {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]StoredPrinter, 0, len(s.items))
	for _, p := range s.items {
		out = append(out, *p)
	}
	return out
}

func (s *PrinterStore) GetPrinter(id string) (*bambulabs_api.Printer, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	p, ok := s.printer[id]
	return p, ok
}

func (s *PrinterStore) SetPrinter(id string, p *bambulabs_api.Printer) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.printer[id] = p
}

func (s *PrinterStore) ClearPrinter(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.printer, id)
}

func (s *PrinterStore) Load() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	data, err := os.ReadFile(s.filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	var list []StoredPrinter
	if err := json.Unmarshal(data, &list); err != nil {
		return err
	}
	s.items = make(map[string]*StoredPrinter)
	for i := range list {
		p := &list[i]
		if p.ID == "" {
			p.ID = p.SerialNumber
		}
		s.items[p.ID] = p
	}
	return nil
}

func (s *PrinterStore) Save() error {
	s.mu.RLock()
	list := make([]StoredPrinter, 0, len(s.items))
	for _, p := range s.items {
		list = append(list, *p)
	}
	s.mu.RUnlock()

	dir := filepath.Dir(s.filePath)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return err
	}
	data, err := json.MarshalIndent(list, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.filePath, data, 0600)
}
