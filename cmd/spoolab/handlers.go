package main

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/torbenconto/bambulabs_api"
	"github.com/torbenconto/bambulabs_api/light"
	"github.com/torbenconto/bambulabs_api/state"
)

type Server struct {
	store *PrinterStore
}

func pathID(r *http.Request) string {
	if id := r.PathValue("id"); id != "" {
		return id
	}
	return strings.TrimPrefix(r.URL.Path, "/api/printers/")
}

func (s *Server) handleListPrinters(w http.ResponseWriter, r *http.Request) {
	list := s.store.List()
	// Build response with connection status
	type item struct {
		StoredPrinter
		Connected bool `json:"connected"`
	}
	out := make([]item, len(list))
	for i, p := range list {
		_, connected := s.store.GetPrinter(p.ID)
		out[i] = item{StoredPrinter: p, Connected: connected}
	}
	writeJSON(w, out)
}

func (s *Server) handleAddPrinter(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Host         string `json:"host"`
		AccessCode   string `json:"access_code"`
		SerialNumber string `json:"serial_number"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	if body.Host == "" || body.AccessCode == "" || body.SerialNumber == "" {
		http.Error(w, "host, access_code and serial_number required", http.StatusBadRequest)
		return
	}
	id := body.SerialNumber
	stored := StoredPrinter{ID: id, Host: body.Host, AccessCode: body.AccessCode, SerialNumber: body.SerialNumber}
	s.store.Add(stored)
	if err := s.store.Save(); err != nil {
		http.Error(w, "failed to save", http.StatusInternalServerError)
		return
	}
	writeJSON(w, stored)
}

func (s *Server) handleRemovePrinter(w http.ResponseWriter, r *http.Request) {
	id := pathID(r)
	stored, ok := s.store.Get(id)
	if !ok {
		http.Error(w, "printer not found", http.StatusNotFound)
		return
	}
	s.store.Remove(id)
	_ = s.store.Save()
	writeJSON(w, stored)
}

func (s *Server) handleConnect(w http.ResponseWriter, r *http.Request) {
	id := pathID(r)
	stored, ok := s.store.Get(id)
	if !ok {
		http.Error(w, "printer not found", http.StatusNotFound)
		return
	}
	if _, connected := s.store.GetPrinter(id); connected {
		writeJSON(w, map[string]string{"status": "already connected"})
		return
	}
	cfg := &bambulabs_api.PrinterConfig{
		Host:         stored.Host,
		AccessCode:   stored.AccessCode,
		SerialNumber: stored.SerialNumber,
	}
	printer := bambulabs_api.NewPrinter(cfg)
	if err := printer.Connect(); err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	s.store.SetPrinter(id, printer)
	writeJSON(w, map[string]string{"status": "connected"})
}

func (s *Server) handleDisconnect(w http.ResponseWriter, r *http.Request) {
	id := pathID(r)
	p, ok := s.store.GetPrinter(id)
	if !ok {
		writeJSON(w, map[string]string{"status": "disconnected"})
		return
	}
	_ = p.Disconnect()
	s.store.ClearPrinter(id)
	writeJSON(w, map[string]string{"status": "disconnected"})
}

func (s *Server) handleGetData(w http.ResponseWriter, r *http.Request) {
	id := pathID(r)
	p, ok := s.store.GetPrinter(id)
	if !ok {
		http.Error(w, "printer not connected", http.StatusBadRequest)
		return
	}
	data, err := p.Data()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, dataToMap(data))
}

func (s *Server) handleLight(w http.ResponseWriter, r *http.Request) {
	id := pathID(r)
	p, ok := s.store.GetPrinter(id)
	if !ok {
		http.Error(w, "printer not connected", http.StatusBadRequest)
		return
	}
	var body struct {
		Light string `json:"light"` // chamber_light | work_light
		On    bool   `json:"on"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	var l light.Light
	switch body.Light {
	case "chamber_light", "":
		l = light.ChamberLight
	case "work_light":
		l = light.WorkLight
	default:
		http.Error(w, "invalid light", http.StatusBadRequest)
		return
	}
	var err error
	if body.On {
		err = p.LightOn(l)
	} else {
		err = p.LightOff(l)
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]bool{"on": body.On})
}

func (s *Server) handlePause(w http.ResponseWriter, r *http.Request) {
	id := pathID(r)
	p, ok := s.store.GetPrinter(id)
	if !ok {
		http.Error(w, "printer not connected", http.StatusBadRequest)
		return
	}
	if err := p.PausePrint(); err != nil {
		http.Error(w, err.Error(), http.StatusConflict)
		return
	}
	writeJSON(w, map[string]string{"status": "paused"})
}

func (s *Server) handleResume(w http.ResponseWriter, r *http.Request) {
	id := pathID(r)
	p, ok := s.store.GetPrinter(id)
	if !ok {
		http.Error(w, "printer not connected", http.StatusBadRequest)
		return
	}
	if err := p.ResumePrint(); err != nil {
		http.Error(w, err.Error(), http.StatusConflict)
		return
	}
	writeJSON(w, map[string]string{"status": "resumed"})
}

func (s *Server) handleStop(w http.ResponseWriter, r *http.Request) {
	id := pathID(r)
	p, ok := s.store.GetPrinter(id)
	if !ok {
		http.Error(w, "printer not connected", http.StatusBadRequest)
		return
	}
	if err := p.StopPrint(); err != nil {
		http.Error(w, err.Error(), http.StatusConflict)
		return
	}
	writeJSON(w, map[string]string{"status": "stopped"})
}

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}

func dataToMap(d bambulabs_api.Data) map[string]interface{} {
	lights := make([]map[string]string, 0, len(d.LightReport))
	for _, lr := range d.LightReport {
		lights = append(lights, map[string]string{
			"node": string(lr.Node),
			"mode": string(lr.Mode),
		})
	}
	return map[string]interface{}{
		"gcode_state":                string(d.GcodeState),
		"gcode_state_description":    d.GcodeState.String(),
		"bed_temperature":            d.BedTemperature,
		"bed_target_temperature":    d.BedTargetTemperature,
		"nozzle_temperature":         d.NozzleTemperature,
		"nozzle_target_temperature":  d.NozzleTargetTemperature,
		"chamber_temperature":        d.ChamberTemperature,
		"print_percent_done":         d.PrintPercentDone,
		"remaining_print_time":       d.RemainingPrintTime,
		"gcode_file":                 d.GcodeFile,
		"print_error_code":           d.PrintErrorCode,
		"lights_report":              lights,
		"ams_exists":                 d.AmsExists,
		"wifi_signal":                d.WifiSignal,
	}
}

