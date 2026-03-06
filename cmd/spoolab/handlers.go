package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/torbenconto/bambulabs_api"
	"github.com/torbenconto/bambulabs_api/light"
	"image/color"
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
		Model        string `json:"model"`
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
	stored := StoredPrinter{
		ID:           id,
		Host:         body.Host,
		AccessCode:   body.AccessCode,
		SerialNumber: body.SerialNumber,
		Model:        body.Model,
	}
	s.store.Add(stored)
	if err := s.store.Save(); err != nil {
		http.Error(w, "failed to save", http.StatusInternalServerError)
		return
	}
	writeJSON(w, stored)
}

func (s *Server) handleUpdatePrinter(w http.ResponseWriter, r *http.Request) {
	id := pathID(r)
	stored, ok := s.store.Get(id)
	if !ok {
		http.Error(w, "printer not found", http.StatusNotFound)
		return
	}
	var body struct {
		Model            string   `json:"model"`
		MachinePrice     *float64 `json:"machine_price"`
		MachineLifeHours *float64 `json:"machine_life_hours"`
		CostPerHour      *float64 `json:"cost_per_hour"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	s.store.UpdateModel(id, body.Model)
	if body.MachinePrice != nil || body.MachineLifeHours != nil || body.CostPerHour != nil {
		price, life, cost := stored.MachinePrice, stored.MachineLifeHours, stored.CostPerHour
		if body.MachinePrice != nil {
			price = *body.MachinePrice
		}
		if body.MachineLifeHours != nil {
			life = *body.MachineLifeHours
		}
		if body.CostPerHour != nil {
			cost = *body.CostPerHour
		}
		s.store.UpdateAnalytics(id, price, life, cost)
	}
	if err := s.store.Save(); err != nil {
		http.Error(w, "failed to save", http.StatusInternalServerError)
		return
	}
	stored, _ = s.store.Get(id)
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
	log.Printf("[Spoolab] Conectando à impressora %s em %s:8883 ...", stored.SerialNumber, stored.Host)
	printer := bambulabs_api.NewPrinter(cfg)
	if err := printer.Connect(); err != nil {
		log.Printf("[Spoolab] Erro ao conectar %s: %v", stored.SerialNumber, err)
		msg := err.Error()
		if strings.Contains(strings.ToLower(msg), "timeout") || strings.Contains(msg, "i/o timeout") {
			msg = "Timeout ao conectar na impressora. Confira se o PC está na mesma rede (mesmo Wi‑Fi/LAN), se o IP está correto e se o firewall não bloqueia a porta 8883."
		}
		http.Error(w, msg, http.StatusBadGateway)
		return
	}
	log.Printf("[Spoolab] Impressora %s conectada.", stored.SerialNumber)
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

func (s *Server) handleListFiles(w http.ResponseWriter, r *http.Request) {
	id := pathID(r)
	p, ok := s.store.GetPrinter(id)
	if !ok {
		http.Error(w, "printer not connected", http.StatusBadRequest)
		return
	}
	path := r.URL.Query().Get("path")
	if path == "" {
		path = "/"
	}
	if strings.Contains(path, "..") {
		http.Error(w, "invalid path", http.StatusBadRequest)
		return
	}
	entries, err := p.ListDirectory(path)
	if err != nil {
		log.Printf("[Spoolab] ListDirectory %q: %v", path, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	type fileInfo struct {
		Name    string `json:"name"`
		Size    int64  `json:"size"`
		ModTime string `json:"mod_time"`
		IsDir   bool   `json:"is_dir"`
	}
	out := make([]fileInfo, 0, len(entries))
	for _, e := range entries {
		out = append(out, fileInfo{
			Name:    e.Name(),
			Size:    e.Size(),
			ModTime: e.ModTime().Format("2006-01-02 15:04:05"),
			IsDir:   e.IsDir(),
		})
	}
	writeJSON(w, map[string]interface{}{"path": path, "entries": out})
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

func rgbaToHex(c color.RGBA) string {
	if c.A == 0 {
		return "#000000"
	}
	return fmt.Sprintf("#%02x%02x%02x", c.R, c.G, c.B)
}

func trayToMap(t bambulabs_api.Tray) map[string]interface{} {
	return map[string]interface{}{
		"id":                  t.ID,
		"bed_temperature":     t.BedTemperature,
		"drying_temperature":  t.DryingTemperature,
		"drying_time":         t.DryingTime,
		"nozzle_temp_max":     t.NozzleTempMax,
		"nozzle_temp_min":     t.NozzleTempMin,
		"tray_color":          rgbaToHex(t.TrayColor),
		"tray_diameter":       t.TrayDiameter,
		"tray_sub_brands":     t.TraySubBrands,
		"tray_type":           t.TrayType,
		"tray_weight":         t.TrayWeight,
	}
}

func dataToMap(d bambulabs_api.Data) map[string]interface{} {
	lights := make([]map[string]string, 0, len(d.LightReport))
	for _, lr := range d.LightReport {
		lights = append(lights, map[string]string{
			"node": string(lr.Node),
			"mode": string(lr.Mode),
		})
	}
	amsList := make([]map[string]interface{}, 0, len(d.Ams))
	for _, a := range d.Ams {
		trays := make([]map[string]interface{}, 0, len(a.Trays))
		for _, t := range a.Trays {
			trays = append(trays, trayToMap(t))
		}
		amsList = append(amsList, map[string]interface{}{
			"id":          a.ID,
			"humidity":    a.Humidity,
			"temperature": a.Temperature,
			"trays":       trays,
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
		"ams":                        amsList,
		"vt_tray":                    trayToMap(d.VtTray),
		"wifi_signal":                d.WifiSignal,
		"nozzle_diameter":            d.NozzleDiameter,
		"auxiliary_fan_speed":        d.AuxiliaryFanSpeed,
		"chamber_fan_speed":          d.ChamberFanSpeed,
		"part_fan_speed":             d.PartFanSpeed,
	}
}

