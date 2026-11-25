import React, { useState, useEffect } from "react";
import { getApiBase, obtenerHeadersAuth } from "../services/api";

export function useAuth() {
  const [usuario, setUsuario] = useState(null);
  const [cargandoAuth, setCargandoAuth] = useState(true);

  const validarSesion = async () => {
    const token = localStorage.getItem("aboghub_token");
    if (!token) {
      setUsuario(null);
      setCargandoAuth(false);
      return;
    }

    try {
      const res = await fetch(`${getApiBase()}/auth/me`, {
        headers: obtenerHeadersAuth()
      });
      if (!res.ok) {
        throw new Error("Sesión expirada");
      }
      const data = await res.json();
      setUsuario(data.usuario);
    } catch {
      localStorage.removeItem("aboghub_token");
      setUsuario(null);
    } finally {
      setCargandoAuth(false);
    }
  };

  useEffect(() => {
    validarSesion();
  }, []);

  const guardarSesion = (token, datosUsuario) => {
    localStorage.setItem("aboghub_token", token);
    setUsuario(datosUsuario);
  };

  const cerrarSesion = () => {
    localStorage.removeItem("aboghub_token");
    setUsuario(null);
  };

  return {
    usuario,
    cargandoAuth,
    guardarSesion,
    cerrarSesion
  };
}
