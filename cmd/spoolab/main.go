package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
)

func handleRoot(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{
		"name": "Spoolab API",
		"docs": "GET /api/printers to list printers",
	})
}

func main() {
	store := NewPrinterStore()
	if err := store.Load(); err != nil {
		log.Printf("Warning: could not load printers: %v", err)
	}

	s := &Server{store: store}
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/printers", s.handleListPrinters)
	mux.HandleFunc("POST /api/printers", s.handleAddPrinter)
	mux.HandleFunc("DELETE /api/printers/{id}", s.handleRemovePrinter)
	mux.HandleFunc("POST /api/printers/{id}/connect", s.handleConnect)
	mux.HandleFunc("POST /api/printers/{id}/disconnect", s.handleDisconnect)
	mux.HandleFunc("GET /api/printers/{id}/data", s.handleGetData)
	mux.HandleFunc("GET /api/printers/{id}/files", s.handleListFiles)
	mux.HandleFunc("POST /api/printers/{id}/light", s.handleLight)
	mux.HandleFunc("POST /api/printers/{id}/pause", s.handlePause)
	mux.HandleFunc("POST /api/printers/{id}/resume", s.handleResume)
	mux.HandleFunc("POST /api/printers/{id}/stop", s.handleStop)

	if staticDir := os.Getenv("SPOOLAB_STATIC"); staticDir != "" {
		mux.Handle("/", spaFileServer(http.Dir(staticDir)))
	} else {
		mux.HandleFunc("GET /", handleRoot)
	}

	addr := ":8080"
	if p := os.Getenv("PORT"); p != "" {
		addr = ":" + p
	}
	log.Printf("Spoolab API listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, corsMiddleware(mux)))
}
