import React from "react";
import {
  Scale,
  ArrowRight,
  ShieldCheck,
  Database,
  Cpu,
  BookOpen,
  Code2,
  Lock,
  CheckCircle2
} from "lucide-react";

export default function LandingPage({ estadoDB, abrirModalAuth }) {
  return (
    <div className="flex-1 bg-white text-black">
      <section className="max-w-7xl mx-auto px-8 pt-16 pb-14 border-b-2 border-black">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-100 border border-neutral-300 text-[11px] font-extrabold uppercase tracking-[0.2em] text-blue-600">
              <Lock className="w-3.5 h-3.5" />
              Motor RAG Jurídico Soberano • Licencia Apache 2.0
            </div>

            <h1 className="text-5xl md:text-6xl font-black tracking-tight uppercase leading-[1.02] text-black">
              TU PROBLEMA LEGAL,
              <br />
              UNA SOLUCIÓN
              <br />
              <span className="text-blue-600">INTELIGENTE.</span>
            </h1>

            <p className="text-base text-neutral-600 max-w-xl leading-relaxed">
              Bienvenido a <strong>AbogHub IA Propia</strong>. El primer motor de inteligencia artificial jurídica del Perú entrenado y conectado en tiempo real con la Constitución Política, Normas Legales de El Peruano y Jurisprudencia Nacional, con cero dependencia de APIs comerciales externas.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => abrirModalAuth("register")}
                className="bg-black hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-[0.18em] px-8 py-4 rounded-full flex items-center gap-3 transition"
              >
                Crear Cuenta Gratis <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => abrirModalAuth("login")}
                className="border-2 border-black hover:bg-neutral-100 text-black text-xs font-bold uppercase tracking-[0.18em] px-7 py-3.5 transition"
              >
                Iniciar Sesión
              </button>
            </div>

            <div className="pt-4 flex flex-wrap items-center gap-6 text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {estadoDB.registros} Artículos Vectorizados
              </span>
              <span>/</span>
              <span>Cero Alucinaciones</span>
              <span>/</span>
              <span>API Key para Integración Externa</span>
            </div>
          </div>

          <div className="lg:col-span-5 bg-neutral-50 border-2 border-black p-7 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-300 pb-4">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-blue-600" />
                <span className="text-xs font-black uppercase tracking-[0.18em]">
                  Vista Previa del Dictamen IA
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 bg-black text-white">
                Acceso con Registro
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-black text-white p-3.5 font-medium">
                "¿Cuáles son las infracciones muy graves del empleador en la Ley N° 31572 del Teletrabajo?"
              </div>

              <div className="bg-white border-l-4 border-blue-600 p-4 space-y-2 text-neutral-800">
                <p className="font-bold text-black">
                  Dictamen Normativo Verificado (Qwen 3 - 8B):
                </p>
                <p className="leading-relaxed">
                  Conforme al <strong>Artículo 27.3 de la Ley N° 31572</strong>, constituye infracción muy grave no respetar el derecho del teletrabajador a la desconexión digital fuera de su jornada laboral (mínimo 12 horas continuas según el Artículo 12.d).
                </p>
                <div className="pt-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  <span>Evidencia: Ley N° 31572 - Art. 27</span>
                  <span>80.5% Similitud Semántica</span>
                </div>
              </div>
            </div>

            <div className="bg-neutral-100 border border-neutral-300 p-4 text-center">
              <p className="text-xs font-bold text-neutral-800 mb-2">
                Para realizar consultas jurídicas al motor RAG se requiere una cuenta activa.
              </p>
              <button
                type="button"
                onClick={() => abrirModalAuth("login")}
                className="text-xs font-extrabold uppercase tracking-wider text-blue-600 hover:text-black underline"
              >
                Inicia sesión o regístrate en 10 segundos →
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="border border-neutral-200 p-6 hover:border-black transition">
            <BookOpen className="w-7 h-7 text-blue-600 mb-3" />
            <h3 className="text-sm font-black uppercase tracking-wider mb-2">
              Búsqueda Híbrida Peruana
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Combina coincidencia exacta por número de Artículo con vectores semánticos de 384 dimensiones en Supabase pgvector.
            </p>
          </div>

          <div className="border border-neutral-200 p-6 hover:border-black transition">
            <Cpu className="w-7 h-7 text-emerald-600 mb-3" />
            <h3 className="text-sm font-black uppercase tracking-wider mb-2">
              Doble Perfil Inteligente
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Modo Copiloto Técnico para Abogados litigantes y Modo Orientación Ciudadana con derivación directa al Marketplace de AbogHub.
            </p>
          </div>

          <div className="border border-neutral-200 p-6 hover:border-black transition">
            <ShieldCheck className="w-7 h-7 text-blue-600 mb-3" />
            <h3 className="text-sm font-black uppercase tracking-wider mb-2">
              Gobierno RBAC Estricto
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Jerarquía blindada con Superadmin inmutable en servidor, Administradores de ingesta normativa y Usuarios verificados.
            </p>
          </div>

          <div className="border border-neutral-200 p-6 hover:border-black transition">
            <Code2 className="w-7 h-7 text-emerald-600 mb-3" />
            <h3 className="text-sm font-black uppercase tracking-wider mb-2">
              API Keys Tipo OpenAI
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Genera llaves <code className="font-mono bg-neutral-100 px-1">abog_live_...</code> para conectar AbogHub IA dentro de cualquier otra web o app de la empresa.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
