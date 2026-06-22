import React, { createContext, useContext, useState, useCallback } from "react";
import type { GameState } from "../types";

interface GameContextType {
  state: GameState;
  setPhase: (phase: GameState["phase"]) => void;
  setCharacter: (id: string) => void;
  setPlayerName: (name: string) => void;
  setSessionId: (id: string) => void;
  setScore: (score: number) => void;
  setPhoneConnected: (connected: boolean) => void;
  quickRestart: () => void;
  reset: () => void;
}

const defaultState: GameState = {
  phase: "home",
  characterId: "speeder",
  playerName: "",
  sessionId: "",
  score: 0,
  highScore: 0,
  phoneConnected: false,
};

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState>(() => {
    const saved = localStorage.getItem("vv-highscore");
    return { ...defaultState, highScore: saved ? Number(saved) : 0 };
  });

  const setPhase = useCallback((phase: GameState["phase"]) => {
    setState((s) => ({ ...s, phase }));
  }, []);

  const setCharacter = useCallback((characterId: string) => {
    setState((s) => ({ ...s, characterId }));
  }, []);

  const setPlayerName = useCallback((playerName: string) => {
    setState((s) => ({ ...s, playerName }));
  }, []);

  const setSessionId = useCallback((sessionId: string) => {
    setState((s) => ({ ...s, sessionId }));
  }, []);

  const setScore = useCallback((score: number) => {
    setState((s) => {
      const highScore = Math.max(s.highScore, score);
      localStorage.setItem("vv-highscore", String(highScore));
      return { ...s, score, highScore };
    });
  }, []);

  const setPhoneConnected = useCallback((connected: boolean) => {
    setState((s) => ({ ...s, phoneConnected: connected }));
  }, []);

  // Restart without reconnecting — keeps session and phone connection
  const quickRestart = useCallback(() => {
    setState((s) => ({
      ...s,
      phase: "countdown",
      score: 0,
    }));
  }, []);

  const reset = useCallback(() => {
    setState((s) => ({
      ...defaultState,
      highScore: s.highScore,
      characterId: s.characterId,
      playerName: s.playerName,
    }));
  }, []);

  return (
    <GameContext.Provider
      value={{
        state,
        setPhase,
        setCharacter,
        setPlayerName,
        setSessionId,
        setScore,
        setPhoneConnected,
        quickRestart,
        reset,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
