import React from "react";

export function formatearTextoLegal(texto) {
  if (!texto) return null;
  const textoLimpio = texto.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  const partes = textoLimpio.split(/(\*\*.*?\*\*)/g);
  return partes.map((parte, index) => {
    if (parte.startsWith("**") && parte.endsWith("**")) {
      return (
        <strong key={index} className="font-bold text-black bg-blue-50 px-1 rounded">
          {parte.slice(2, -2)}
        </strong>
      );
    }
    return parte;
  });
}
