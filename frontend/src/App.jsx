/* ═══════════════════════════════════════════════════════════════════
   RUIDO — App (React root)
   ═══════════════════════════════════════════════════════════════════ */

import React, { useState, useCallback } from "react";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import CRTOverlay from "./components/layout/CRTOverlay";
import GlitchField from "./components/ui/GlitchField";
import TestigoView from "./components/testigo/TestigoView";
import VerificarView from "./components/testigo/VerificarView";
import { useCRTAudio } from "./hooks/useCRTAudio";
import "./App.css";

export default function App() {
    const [activeTab, setActiveTab] = useState("testigo");

    useCRTAudio({ autoStartHum: true });

    const handleTabChange = useCallback((tab) => {
        setActiveTab(tab);
        window.scrollTo({ top: 0, behavior: "auto" });
    }, []);

    return (
        <>
            <GlitchField />
            <CRTOverlay />

            <a className="skip-link" href="#stage">
                Skip to the experiment
            </a>

            <Header activeTab={activeTab} onTabChange={handleTabChange} />

            <main id="app-main">
                {activeTab === "testigo" && <TestigoView />}
                {activeTab === "verificar" && <VerificarView />}
            </main>

            <Footer />
        </>
    );
}
