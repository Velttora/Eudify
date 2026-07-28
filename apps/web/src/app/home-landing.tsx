'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

import { PublicSiteHeader } from '@/shared/components/public-site-header';

// ─── Reveal hook ────────────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('lp-visible')),
      { threshold: 0.1 },
    );
    el.querySelectorAll('.lp-reveal').forEach((node) => obs.observe(node));
    return () => obs.disconnect();
  }, []);
  return ref;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Hero() {
  return (
    <section
      style={{ background: 'var(--navy)' }}
      className="relative overflow-hidden px-6 pb-20 pt-32 sm:px-[max(24px,6vw)] sm:pt-36"
    >
      {/* orbs */}
      <div
        className="pointer-events-none absolute -right-20 -top-32 h-[600px] w-[600px] rounded-full"
        style={{ background: 'radial-gradient(circle,rgba(41,128,185,.28) 0%,transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-48 -left-24 h-[700px] w-[700px] rounded-full"
        style={{ background: 'radial-gradient(circle,rgba(212,147,10,.10) 0%,transparent 70%)' }}
      />
      {/* grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(41,128,185,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(41,128,185,.06) 1px,transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1180px]">
        {/* eyebrow */}
        <div
          className="mb-7 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[1.5px]"
          style={{
            background: 'rgba(245,180,41,.14)',
            borderColor: 'rgba(245,180,41,.35)',
            color: 'var(--accent-hover)',
          }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
          Educación · Cuidado · Desarrollo
        </div>

        {/* heading */}
        <h1
          className="mb-6 max-w-[820px] text-white"
          style={{
            fontFamily: 'var(--font-serif, Georgia, serif)',
            fontSize: 'clamp(44px,7vw,88px)',
            lineHeight: 0.96,
            letterSpacing: '-2px',
          }}
        >
          El desarrollo de<br />tu hijo merece<br />
          <em style={{ color: 'var(--accent-hover)', fontStyle: 'italic' }}>lo mejor</em> de LATAM.
        </h1>

        <p className="mb-11 max-w-[560px] font-light leading-relaxed text-white/60" style={{ fontSize: 'clamp(16px,1.6vw,20px)' }}>
          Eudify conecta familias con educadores, niñeras y cuidadores verificados — incluyendo apoyo
          prenatal y postnatal — bajo los 7 Pilares del Desarrollo Integral, basados en OMS, UNICEF,
          AAP y neurociencia. Sin búsquedas en WhatsApp, sin apuestas.
        </p>

        <div className="mb-16 flex flex-wrap gap-3">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5"
            style={{ background: 'var(--primary)', boxShadow: '0 0 0 0 transparent' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--primary-hover)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--primary)'; }}
          >
            Explorar para mi familia →
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 rounded-full border px-8 py-3.5 text-sm font-medium text-white transition-all duration-200 hover:bg-white/10"
            style={{ background: 'rgba(255,255,255,.07)', borderColor: 'rgba(255,255,255,.15)' }}
          >
            Soy educador, niñera o cuidadora
          </Link>
        </div>

        {/* stats */}
        <div
          className="flex flex-wrap gap-10 border-t pt-10"
          style={{ borderColor: 'rgba(255,255,255,.1)' }}
        >
          {[
            { num: '18,6%', label: 'Cobertura educación 0–2 años en LATAM', src: 'UNICEF LACRO, 2023' },
            { num: '80%', label: 'Cuidadores en informalidad en Colombia', src: 'DANE / Mintrabajo, 2024' },
            { num: '+1M', label: 'Conexiones neuronales/segundo en primeros años', src: 'Harvard Center on Developing Child' },
            { num: '$343B', label: 'Mercado global childcare en 2024', src: 'Grand View Research, 2024' },
          ].map(({ num, label, src }) => (
            <div key={num}>
              <div
                style={{
                  fontFamily: 'var(--font-serif, Georgia, serif)',
                  fontSize: 'clamp(36px,4vw,52px)',
                  color: 'var(--accent-hover)',
                  lineHeight: 1,
                  marginBottom: 4,
                }}
              >
                {num}
              </div>
              <div className="text-[13px] text-white/45">{label}</div>
              <div className="mt-0.5 text-[11px] text-white/25">{src}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Ticker() {
  const items = [
    'Verificación biométrica de providers',
    'Plan Anual con 26 módulos quincenales',
    'Basado en OMS · UNICEF · AAP · CDC',
    '7 Pilares del Desarrollo Integral',
    'Matching curricular con IA',
    'Pagos seguros con Stripe Connect',
    'Certificación Eudify para educadores',
  ];
  const doubled = [...items, ...items];
  return (
    <div
      className="overflow-hidden border-t py-3"
      style={{ background: 'var(--primary)', borderColor: 'rgba(0,0,0,.08)' }}
      aria-hidden="true"
    >
      <style>{`
        @keyframes lp-ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .lp-ticker-track{animation:lp-ticker 30s linear infinite;display:flex;white-space:nowrap;}
      `}</style>
      <div className="lp-ticker-track">
        {doubled.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-2 px-10 text-[13px] font-semibold tracking-wide text-white">
            <span className="h-1 w-1 rounded-full bg-white/50" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function SectionLabel({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <div
      className="lp-reveal mb-4 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[2px]"
      style={light ? { color: 'var(--accent-hover)' } : { color: 'var(--primary)' }}
    >
      <span className="h-0.5 w-5" style={{ background: light ? 'var(--accent-hover)' : 'var(--primary)' }} />
      {children}
    </div>
  );
}

function SectionHeading({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <h2
      className={`lp-reveal lp-d1 mb-4 ${light ? 'text-white' : ''}`}
      style={{
        fontFamily: 'var(--font-serif, Georgia, serif)',
        fontSize: 'clamp(32px,4.5vw,54px)',
        lineHeight: 1.04,
        letterSpacing: '-1.5px',
        color: light ? '#fff' : 'var(--navy)',
      }}
    >
      {children}
    </h2>
  );
}

// ─── Problema ────────────────────────────────────────────────────────────────
function Problema() {
  const cards = [
    {
      icon: '🔍',
      title: 'Imposible encontrar providers verificados',
      body: 'El 95% del mercado opera sin verificación de identidad ni antecedentes. Las familias contratan por recomendación informal, sin garantías.',
      stat: '→ 0 estándares de verificación en el mercado informal',
      statColor: 'var(--primary)',
    },
    {
      icon: '🧠',
      title: 'La ventana crítica del cerebro se desperdicia',
      body: 'El cerebro forma más de 1 millón de conexiones neuronales por segundo en los primeros años. La mayoría de familias no tiene guía científica.',
      stat: '→ Solo 18,6% de niños 0-2 años con cobertura · UNICEF 2023',
      statColor: 'var(--accent)',
    },
    {
      icon: '📚',
      title: 'Sin metodología: todo depende de la suerte',
      body: 'Cada educador trabaja solo, sin estándares pedagógicos, sin formación continua y sin retroalimentación. La calidad es totalmente aleatoria.',
      stat: '→ Sin currículo basado en evidencia para familias',
      statColor: 'var(--primary)',
    },
    {
      icon: '🤱',
      title: 'Niñeras y apoyo prenatal, los más invisibles del mercado',
      body: 'Las niñeras, doulas y cuidadoras prenatales operan sin ninguna red de validación. Las familias embarazadas o con bebés no tienen forma de encontrar apoyo confiable y certificado.',
      stat: '→ Sin plataforma especializada en cuidado prenatal/postnatal en LATAM',
      statColor: '#c94030',
    },
    {
      icon: '💸',
      title: '703.000 cuidadores atrapados en la informalidad',
      body: 'En Colombia, el 80% del trabajo doméstico y de cuidado — niñeras, educadores, cuidadores prenatales — opera informalmente. Sin seguridad social ni reputación verificable.',
      stat: '→ 80% informalidad · solo 14% cotiza pensión · DANE 2024',
      statColor: 'var(--primary)',
    },
    {
      icon: '📉',
      title: 'Mercado de $343B funcionando como si fuera 1995',
      body: 'WhatsApp, grupos de Facebook y referencias de vecinos son el "marketplace" de un mercado que vale cientos de miles de millones.',
      stat: '→ $343B mercado global childcare · Grand View Research 2024',
      statColor: 'var(--accent)',
    },
    {
      icon: '🔒',
      title: 'Sin seguridad real para los niños',
      body: 'No hay verificación de antecedentes estándar, protocolos de seguridad ni sistemas de reporte de incidentes en el mercado informal.',
      stat: '→ Cero protocolos de seguridad infantil en el canal informal',
      statColor: '#c94030',
    },
  ];

  return (
    <section className="border-b bg-white px-6 py-24 sm:px-[max(24px,6vw)]">
      <div className="mx-auto max-w-[1180px]">
        <SectionLabel>El problema</SectionLabel>
        <SectionHeading>
          Encontrar a alguien de confianza<br />
          <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>no debería ser una apuesta.</em>
        </SectionHeading>
        <p className="lp-reveal lp-d2 mb-14 max-w-2xl text-[17px] font-light leading-relaxed text-muted-foreground">
          Las familias en LATAM siguen buscando educadores y cuidadores por WhatsApp y boca a boca,
          sin verificación, sin estándares y sin acompañamiento científico.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ icon, title, body, stat, statColor }, i) => (
            <div
              key={title}
              className={`lp-reveal lp-d${(i % 3) + 1} flex flex-col rounded-2xl border p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary`}
              style={{ background: 'var(--background)', borderColor: 'var(--border)' }}
            >
              <span className="mb-4 text-3xl">{icon}</span>
              <div className="mb-2 text-[15px] font-semibold" style={{ color: 'var(--navy)' }}>{title}</div>
              <div className="flex-1 text-[13.5px] leading-relaxed text-muted-foreground">{body}</div>
              <div className="mt-4 text-[12px] font-bold" style={{ color: statColor }}>{stat}</div>
            </div>
          ))}
        </div>

        {/* insight bar */}
        <div
          className="lp-reveal mt-8 flex flex-col items-start gap-7 rounded-2xl border p-6 sm:flex-row sm:items-center sm:p-8"
          style={{ background: 'rgba(201,64,48,.05)', borderColor: 'rgba(201,64,48,.18)' }}
        >
          <div
            style={{
              fontFamily: 'var(--font-serif, Georgia, serif)',
              fontSize: 'clamp(48px,6vw,72px)',
              color: '#c94030',
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            77,5%
          </div>
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            de los niños de 3–6 años en LATAM acceden a algún programa preescolar — pero{' '}
            <strong style={{ color: 'var(--navy)' }}>una cuarta parte queda fuera</strong> y la cobertura
            de 0 a 2 años sigue en apenas el 18,6%.{' '}
            <strong style={{ color: 'var(--navy)' }}>Eudify es la infraestructura que faltaba.</strong>
            <span className="mt-1 block text-[11px] text-muted-foreground/60">
              Fuente: UNICEF LACRO — &ldquo;Early Childhood Education for All&rdquo;, agosto 2023
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── Solución ─────────────────────────────────────────────────────────────────
function Solucion() {
  const layers = [
    {
      num: '1',
      color: 'var(--primary)',
      bg: 'rgba(41,128,185,.1)',
      title: 'Capa de Confianza — Trust & Safety',
      body: 'Verificación biométrica de identidad, antecedentes penales y sexuales, assessment pedagógico y certificación Eudify antes de cualquier primera sesión.',
    },
    {
      num: '2',
      color: 'var(--accent)',
      bg: 'rgba(212,147,10,.1)',
      title: 'Metodología Eudify — Los 7 Pilares',
      body: 'El único marketplace con currículo pedagógico integrado: Plan Anual de 26 módulos quincenales basado en Aire, Tierra, Luz, Agua, Alimentación, Emociones y Movimiento.',
    },
    {
      num: '3',
      color: '#c94030',
      bg: 'rgba(201,64,48,.1)',
      title: 'Marketplace Operativo + Pagos Seguros',
      body: 'Discovery con filtros curriculares, reservas, disponibilidad, chat y pagos con Stripe Connect. Comisión 15–22% por sesión + suscripciones + certificaciones.',
    },
    {
      num: '4',
      color: 'var(--primary)',
      bg: 'rgba(41,128,185,.1)',
      title: 'IA para Matching Curricular Personalizado',
      body: '"María cubre 4 de tus 6 objetivos pendientes en Emociones." El sistema cruza metas curriculares del niño con competencias del educador. Recalibración mensual automática.',
    },
    {
      num: '5',
      color: 'var(--accent)',
      bg: 'rgba(212,147,10,.1)',
      title: 'Red de Providers Certificados Eudify',
      body: 'Sistema escalonado: Starter → Certified → Master → Fellow. LMS propio, recertificación anual, mejores ingresos y más visibilidad que cualquier canal informal.',
    },
  ];

  return (
    <section className="px-6 py-24 sm:px-[max(24px,6vw)]" style={{ background: 'var(--background)' }}>
      <div className="mx-auto max-w-[1180px]">
        <SectionLabel>La solución</SectionLabel>
        <SectionHeading>
          Eudify no es una app de clases.<br />
          <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>Es la infraestructura</em> que el
          mercado nunca tuvo.
        </SectionHeading>
        <p className="lp-reveal lp-d2 mb-14 max-w-2xl text-[17px] font-light leading-relaxed text-muted-foreground">
          Tres capas que se refuerzan mutuamente y que ningún competidor puede replicar rápidamente.
        </p>

        <div className="grid gap-10 lg:grid-cols-2">
          {/* left */}
          <div className="flex flex-col gap-4">
            <div
              className="lp-reveal rounded-2xl border-l-4 p-6"
              style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderLeftColor: 'var(--primary)',
                borderLeftWidth: 3,
              }}
            >
              <div
                className="mb-4 text-[11px] font-bold uppercase tracking-[1.5px]"
                style={{ color: 'var(--primary)' }}
              >
                ✅ Ya construido y funcionando
              </div>
              <ul className="space-y-2">
                {[
                  'Marketplace con discovery, filtros y perfiles públicos',
                  'Reservas, agenda, chat y soporte integrados',
                  'Pagos Stripe Connect: cobro, comisión y liquidación automática',
                  'Reseñas y reputación verificada post-sesión',
                  'Planner educativo por edad con roadmap y persistencia',
                  'Auth segura con Clerk + roles Familia y Educador',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[13.5px] text-muted-foreground">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: 'var(--primary)' }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="lp-reveal lp-d1 rounded-2xl border p-5"
              style={{ background: 'rgba(41,128,185,.06)', borderColor: 'rgba(41,128,185,.18)' }}
            >
              <div
                className="mb-3 text-[11px] font-bold uppercase tracking-[1.5px] text-muted-foreground"
              >
                El foso competitivo de Eudify
              </div>
              {[
                { color: 'var(--primary)', label: 'Confianza:', text: 'KYC biométrico + antecedentes + certificación' },
                { color: 'var(--accent)', label: 'Metodología:', text: '7 Pilares con evidencia OMS / UNICEF / AAP' },
                { color: '#c94030', label: 'Network effects:', text: 'más providers → más familias → más valor' },
              ].map(({ color, label, text }) => (
                <div key={label} className="mb-2 flex items-start gap-3 text-[13.5px]">
                  <span
                    className="mt-1 h-2 w-2 shrink-0 rounded-sm"
                    style={{ background: color }}
                  />
                  <span className="text-muted-foreground">
                    <strong style={{ color: 'var(--navy)' }}>{label}</strong> {text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* right — layers */}
          <div className="flex flex-col gap-3">
            {layers.map(({ num, color, bg, title, body }, i) => (
              <div
                key={num}
                className={`lp-reveal lp-d${i % 4} flex gap-4 rounded-2xl border p-5 transition-all duration-200 hover:translate-x-1`}
                style={{ background: '#fff', borderColor: 'var(--border)' }}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-sm font-bold"
                  style={{ background: bg, color }}
                >
                  {num}
                </div>
                <div>
                  <div className="mb-1 text-[14px] font-semibold" style={{ color: 'var(--navy)' }}>{title}</div>
                  <div className="text-[12.5px] leading-relaxed text-muted-foreground">{body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 7 Pilares ───────────────────────────────────────────────────────────────
function Pilares() {
  const pilares = [
    { n: 'P1', name: 'Aire & Regulación', body: 'Calidad del aire, rutina sin pantallas nocturnas, gestión de la carga sensorial', bg: '#EBF5FE', color: '#0D5E9E' },
    { n: 'P2', name: 'Tierra & Naturaleza', body: 'Contacto con naturaleza, juego al aire libre, ciclos naturales', bg: '#EAF5EC', color: '#1A7A2E' },
    { n: 'P3', name: 'Luz & Ritmos', body: 'Luz natural matutina, ritmos circadianos, protección solar', bg: '#FEF8E6', color: '#9C6700' },
    { n: 'P4', name: 'Agua e Hidratación', body: 'Agua como bebida base, reducción de bebidas azucaradas', bg: '#E8F4FD', color: '#1060A0' },
    { n: 'P5', name: 'Alimentación', body: 'Comida real, cocina participativa, comidas familiares compartidas', bg: '#EBF5FE', color: '#1e5f8a' },
    { n: 'P6', name: 'Emociones & Neuro', body: 'Co-regulación, serve & return, lenguaje emocional, vínculo', bg: '#F3EEF9', color: '#6130A0' },
    { n: 'P7', name: 'Movimiento & Fascia', body: 'Juego activo, coordinación, pausas del sedentarismo', bg: '#FEF0ED', color: '#A0321E' },
  ];

  return (
    <section id="pilares" className="overflow-hidden border-b bg-white px-6 py-24 sm:px-[max(24px,6vw)]">
      <div className="mx-auto max-w-[1180px]">
        <SectionLabel>Los 7 Pilares Eudify</SectionLabel>
        <SectionHeading>
          El desarrollo no es un área.<br />
          <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>Es un sistema</em> de 7 dimensiones.
        </SectionHeading>
        <p className="lp-reveal lp-d2 mb-14 max-w-2xl text-[17px] font-light leading-relaxed text-muted-foreground">
          Cada sesión, cada recomendación y cada módulo del Plan Anual conecta múltiples pilares
          simultáneamente — porque así funciona realmente el desarrollo humano.
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {pilares.map(({ n, name, body, bg, color }, i) => (
            <div
              key={n}
              className={`lp-reveal lp-d${(i % 3) + 1} rounded-2xl px-3.5 py-5 text-center transition-transform duration-200 hover:-translate-y-1.5`}
              style={{ background: bg }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-serif, Georgia, serif)',
                  fontSize: 28,
                  fontWeight: 700,
                  lineHeight: 1,
                  color,
                  marginBottom: 8,
                }}
              >
                {n}
              </div>
              <div className="mb-2 text-[11px] font-semibold" style={{ color }}>{name}</div>
              <div className="text-[10.5px] leading-relaxed opacity-75" style={{ color }}>{body}</div>
            </div>
          ))}
        </div>

        {/* connections */}
        <div
          className="lp-reveal mt-10 rounded-2xl border p-7"
          style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}
        >
          <div className="mb-4 text-[13px] font-semibold" style={{ color: 'var(--navy)' }}>
            Cómo se conectan los pilares — todo está relacionado
          </div>
          <div className="space-y-3">
            {[
              {
                anchor: 'Sueño',
                chips: [
                  { label: 'P1 Aire', bg: '#EBF5FE', border: '#b3d4f0', color: '#0D5E9E' },
                  { label: 'P3 Luz', bg: '#FEF8E6', border: '#f0d99a', color: '#9C6700' },
                  { label: 'P6 Emociones', bg: '#F3EEF9', border: '#c9b3e8', color: '#6130A0' },
                  { label: 'P7 Movimiento', bg: '#FEF0ED', border: '#f4b8ac', color: '#A0321E' },
                ],
                note: 'Luz + pantallas + emociones + movimiento determinan la calidad del sueño',
              },
              {
                anchor: 'Alimentación',
                chips: [
                  { label: 'P3 Luz', bg: '#FEF8E6', border: '#f0d99a', color: '#9C6700' },
                  { label: 'P5 Alimentos', bg: '#EBF5FE', border: '#b3d4f0', color: '#1e5f8a' },
                  { label: 'P6 Emociones', bg: '#F3EEF9', border: '#c9b3e8', color: '#6130A0' },
                ],
                note: 'Las emociones y la cultura modulan lo que y cómo comemos',
              },
              {
                anchor: 'Atención',
                chips: [
                  { label: 'P1 Aire', bg: '#EBF5FE', border: '#b3d4f0', color: '#0D5E9E' },
                  { label: 'P2 Tierra', bg: '#EAF5EC', border: '#a8d9b4', color: '#1A7A2E' },
                  { label: 'P3 Luz', bg: '#FEF8E6', border: '#f0d99a', color: '#9C6700' },
                  { label: 'P6 Emociones', bg: '#F3EEF9', border: '#c9b3e8', color: '#6130A0' },
                ],
                note: 'Aire limpio + naturaleza + ritmos circadianos sostienen la atención',
              },
            ].map(({ anchor, chips, note }) => (
              <div key={anchor} className="flex flex-wrap items-center gap-2">
                <span
                  className="min-w-[100px] rounded-lg px-3 py-1.5 text-center text-[12px] font-semibold text-white"
                  style={{ background: 'var(--navy)' }}
                >
                  {anchor}
                </span>
                {chips.map((c) => (
                  <span
                    key={c.label}
                    className="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
                    style={{ background: c.bg, borderColor: c.border, color: c.color }}
                  >
                    {c.label}
                  </span>
                ))}
                <span className="text-[12px] text-muted-foreground">{note}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Para quién ───────────────────────────────────────────────────────────────
function ParaQuien() {
  const cards = [
    {
      icon: '👨‍👩‍👧‍👦',
      title: 'Para Familias',
      body: 'Encuentra al educador o cuidador perfecto para tu hijo, verificado, certificado y alineado al Plan Anual Eudify.',
      items: ['Providers verificados con KYC y antecedentes', 'Roadmap curricular personalizado por edad', 'Plan Anual con 26 módulos quincenales', 'Chat, agenda y pagos seguros en una sola app', 'Reportes semestrales de progreso'],
      checkColor: 'var(--primary-soft)',
      bg: 'rgba(41,128,185,.08)',
    },
    {
      icon: '🧑‍🏫',
      title: 'Para Educadores y Tutores',
      body: 'Deja la informalidad atrás. Construye tu reputación verificada, accede a formación continua y cobra de forma segura.',
      items: ['Certificación Eudify Starter, Certified y Master', 'Acceso a familias verificadas y activas', 'LMS con formación basada en evidencia', 'Pagos automáticos y liquidación en D+2', 'Comisión que baja a medida que creces'],
      checkColor: 'var(--accent-hover)',
      bg: 'rgba(212,147,10,.06)',
    },
    {
      icon: '🤱',
      title: 'Para Niñeras y Cuidadoras Prenatales',
      body: 'Doulas, niñeras, cuidadoras postparto y de apoyo prenatal: formaliza tu trabajo, hazte visible y conecta con familias que te necesitan desde el embarazo.',
      items: ['Perfil verificado con antecedentes y certificación', 'Visibilidad ante familias embarazadas y con bebés', 'Módulos especializados en cuidado prenatal y postnatal', 'Agenda, pagos y chat integrados en una sola app', 'Progresión a nivel Certified con mejor tarifa y visibilidad'],
      checkColor: 'var(--teal-soft, #5dd4ae)',
      bg: 'rgba(14,139,107,.07)',
    },
    {
      icon: '🏢',
      title: 'Para Empresas',
      body: 'Beneficio familiar para empleados con hijos. Reduce el estrés parental de tu equipo con Eudify como parte del paquete.',
      items: ['Plan Eudify Family para todos los empleados con hijos', 'Dashboard HR con métricas de uso y satisfacción', 'Talleres de formación parental', 'Facturación empresarial centralizada', 'Desde $15 USD por empleado al mes'],
      checkColor: '#85c1e9',
      bg: 'rgba(41,128,185,.06)',
    },
    {
      icon: '🏫',
      title: 'Para Colegios e Instituciones',
      body: 'Accede a la metodología Eudify y a una red de providers certificados para complementar tu oferta educativa.',
      items: ['Licencia de metodología para uso institucional', 'API pública para conectar perfil curricular del niño', 'Red de tutores y especialistas certificados', 'Programa de formación docente en 7 Pilares', 'Reportes de desarrollo integrados'],
      checkColor: '#c39bd3',
      bg: 'rgba(107,53,160,.06)',
    },
  ];

  return (
    <section
      className="overflow-hidden px-6 py-24 sm:px-[max(24px,6vw)]"
      id="para-quien"
      style={{ background: 'var(--navy)' }}
    >
      <div className="mx-auto max-w-[1180px]">
        <SectionLabel light>Para quién es Eudify</SectionLabel>
        <SectionHeading light>
          Hecho para{' '}
          <em style={{ color: 'var(--accent-hover)', fontStyle: 'italic' }}>todos los que rodean</em>
          <br />el desarrollo de un niño.
        </SectionHeading>
        <p
          className="lp-reveal lp-d2 mb-14 max-w-2xl text-[17px] font-light leading-relaxed"
          style={{ color: 'rgba(255,255,255,.5)' }}
        >
          Eudify funciona para familias, educadores, niñeras, cuidadoras prenatales, empresas con beneficios familiares e instituciones.
        </p>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ icon, title, body, items, checkColor, bg }, i) => (
            <div
              key={title}
              className={`lp-reveal lp-d${i % 2 + 1} rounded-3xl border p-9 transition-all duration-300 hover:-translate-y-1`}
              style={{ background: bg, borderColor: 'rgba(255,255,255,.08)' }}
            >
              <span className="mb-5 block text-4xl">{icon}</span>
              <div className="mb-2.5 text-xl font-semibold text-white">{title}</div>
              <p className="mb-5 text-[14px] leading-relaxed" style={{ color: 'rgba(255,255,255,.55)' }}>{body}</p>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[13px]" style={{ color: 'rgba(255,255,255,.7)' }}>
                    <span className="mt-0.5 font-bold" style={{ color: checkColor }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Cómo funciona ────────────────────────────────────────────────────────────
function ComoFunciona() {
  const steps = [
    { n: '01', title: 'Crea tu perfil', body: 'Familia o educador. Onboarding guiado con diagnóstico de los 7 Pilares en tu hogar.' },
    { n: '02', title: 'Diagnóstico Eudify', body: 'La IA genera el roadmap curricular de tu hijo con objetivos pendientes por pilar y edad.' },
    { n: '03', title: 'Matching inteligente', body: 'El sistema sugiere el provider certificado que mejor cubre los objetivos de tu hijo.' },
    { n: '04', title: 'Reserva y pago seguro', body: 'Agenda, confirma y paga en la app. El provider recibe su liquidación en D+2.' },
    { n: '05', title: 'Mide el progreso', body: 'Reporte mensual por pilar: cubierto, parcial o pendiente. Ajuste automático del plan.' },
  ];

  return (
    <section className="px-6 py-24 sm:px-[max(24px,6vw)]" style={{ background: 'var(--background)' }}>
      <div className="mx-auto max-w-[1180px]">
        <SectionLabel>Cómo funciona</SectionLabel>
        <SectionHeading>
          De cero confianza a{' '}
          <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>desarrollo<br />medible</em> en 5 pasos.
        </SectionHeading>

        <div className="relative mt-14 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {/* connector line */}
          <div
            className="absolute left-[10%] right-[10%] top-10 hidden h-px lg:block"
            style={{ background: 'linear-gradient(90deg,transparent,var(--primary-soft),transparent)' }}
          />
          {steps.map(({ n, title, body }, i) => (
            <div
              key={n}
              className={`lp-reveal lp-d${i + 1} relative z-10 rounded-2xl border bg-white p-6 text-center transition-all duration-300 hover:-translate-y-1`}
              style={{ borderColor: 'var(--border)' }}
            >
              <div
                className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full text-[15px] font-bold text-white"
                style={{ background: 'var(--navy)' }}
              >
                {n}
              </div>
              <div className="mb-1.5 text-[14px] font-semibold" style={{ color: 'var(--navy)' }}>{title}</div>
              <div className="text-[12px] leading-relaxed text-muted-foreground">{body}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Plan Anual ───────────────────────────────────────────────────────────────
function PlanAnual() {
  const bloques = [
    {
      badge: 'Bloque I · Meses 1–2',
      title: 'Semilla del Hogar',
      period: 'Módulos 1–7 · Hábitos base',
      bg: 'rgba(41,128,185,.08)',
      border: 'rgba(41,128,185,.2)',
      color: 'var(--primary)',
      modules: ['M1 — Mapa familiar Eudify', 'M2 — Aire y descanso', 'M3 — Agua como hábito', 'M4 — La mesa que forma', 'M5 — Emociones con nombre', 'M6 — Moverse para crecer', 'M7 — Luz de mañana'],
    },
    {
      badge: 'Bloque II · Meses 3–5',
      title: 'Cuerpo & Ambiente',
      period: 'Módulos 8–13 · Entorno',
      bg: 'rgba(41,128,179,.08)',
      border: 'rgba(41,128,179,.2)',
      color: 'var(--primary)',
      modules: ['M8 — Tierra viva', 'M9 — Casa respirable', 'M10 — Lonchera y sales', 'M11 — Cocina participativa', 'M12 — Calma sin pantallas', 'M13 — Postura y pausas'],
    },
    {
      badge: 'Bloque III · Meses 6–9',
      title: 'Autonomía Saludable',
      period: 'Módulos 14–20 · Pensamiento crítico',
      bg: 'rgba(200,137,10,.08)',
      border: 'rgba(200,137,10,.2)',
      color: 'var(--accent-soft)',
      modules: ['M14 — Luz y escuela', 'M15 — Orden tecnológico', 'M16 — Aire y barrio', 'M17 — Leer la sed', 'M18 — Leer etiquetas', 'M19 — Frustración y gratitud', 'M20 — Fuerza y coordinación'],
    },
    {
      badge: 'Bloque IV · Meses 10–12',
      title: 'Comunidad & Cultura',
      period: 'Módulos 21–26 · Cultura familiar',
      bg: 'rgba(107,53,160,.08)',
      border: 'rgba(107,53,160,.2)',
      color: '#6B35A0',
      modules: ['M21 — Ritmo anual estable', 'M22 — Salida 4 elementos', 'M23 — Cocina con memoria', 'M24 — Círculo de palabra', 'M25 — Fiesta del movimiento', 'M26 — Cierre y renovación'],
    },
  ];

  return (
    <section id="plan-anual" className="border-b px-6 py-24 sm:px-[max(24px,6vw)]" style={{ background: 'var(--muted)' }}>
      <div className="mx-auto max-w-[1180px]">
        <SectionLabel>Plan Anual Eudify</SectionLabel>
        <SectionHeading>
          26 módulos quincenales.<br />
          <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>Un año completo</em> de desarrollo.
        </SectionHeading>
        <p className="lp-reveal lp-d2 mb-14 max-w-2xl text-[17px] font-light leading-relaxed text-muted-foreground">
          No son actividades sueltas. Es un currículo científico estructurado en 4 bloques.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {bloques.map(({ badge, title, period, bg, border, color, modules }, i) => (
            <div
              key={badge}
              className={`lp-reveal lp-d${i + 1} rounded-2xl border p-5`}
              style={{ background: bg, borderColor: border }}
            >
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[1.5px]" style={{ color }}>{badge}</div>
              <div className="mb-1 text-[15px] font-semibold" style={{ color: 'var(--navy)' }}>{title}</div>
              <div className="mb-4 text-[12px] text-muted-foreground">{period}</div>
              <ul className="space-y-1.5">
                {modules.map((m) => (
                  <li
                    key={m}
                    className="rounded-md px-2 py-1 text-[11.5px] text-muted-foreground"
                    style={{ background: 'rgba(255,255,255,.7)' }}
                  >
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Precios ──────────────────────────────────────────────────────────────────
function Precios() {
  const plans = [
    {
      name: 'Eudify Semilla',
      price: 'Gratis',
      priceNote: '',
      period: 'Para siempre · Sin tarjeta',
      desc: 'Familias que quieren explorar la metodología y buscar providers.',
      items: ['Diagnóstico inicial (7 Pilares)', 'Módulo 1 del Plan Anual', '1 reserva por mes', 'Comunidad básica Eudify'],
      cta: 'Empezar gratis →',
      href: '/sign-up?plan=semilla',
      variant: 'outline' as const,
      featured: false,
    },
    {
      name: 'Eudify Familia',
      price: '$9',
      priceNote: '.99/mes',
      period: 'Facturado mensual · Cancela cuando quieras',
      desc: 'Para familias activas que quieren el plan anual completo y seguimiento.',
      items: ['Plan Anual completo (26 módulos)', 'Reservas ilimitadas', 'Roadmap curricular IA', 'Reportes mensuales de progreso', 'Chat directo con providers'],
      cta: 'Empezar ahora →',
      href: '/sign-up?plan=familia',
      variant: 'primary' as const,
      featured: true,
    },
    {
      name: 'Eudify Familia+',
      price: '$24',
      priceNote: '.99/mes',
      period: 'Para familias que quieren acompañamiento premium',
      desc: 'Todo Familia + coach educativo dedicado + informe semestral.',
      items: ['Todo del plan Familia', 'Coach Eudify asignado al niño', 'Informe semestral detallado', 'Provider recomendado mensual', 'Soporte prioritario directo'],
      cta: 'Explorar Familia+ →',
      href: '/sign-up?plan=familia-plus',
      variant: 'outline' as const,
      featured: false,
    },
    {
      name: 'Eudify Enterprise',
      price: '$15',
      priceNote: '–25/emp.',
      period: 'Por empleado al mes · Facturación empresa',
      desc: 'Beneficio familiar corporativo para equipos con hijos.',
      items: ['Plan Familia+ para empleados con hijos', 'Dashboard HR con métricas de uso', 'Talleres de formación parental', 'Facturación centralizada'],
      cta: 'Hablar con ventas →',
      href: 'mailto:ventas@eudify.com',
      variant: 'outline' as const,
      featured: false,
    },
  ];

  return (
    <section className="border-b bg-white px-6 py-24 sm:px-[max(24px,6vw)]" id="precios">
      <div className="mx-auto max-w-[1180px]">
        <SectionLabel>Planes y precios</SectionLabel>
        <SectionHeading>
          Elige el plan{' '}
          <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>para tu familia</em>
          <br />o tu carrera educativa.
        </SectionHeading>
        <p className="lp-reveal lp-d2 mb-14 max-w-2xl text-[17px] font-light leading-relaxed text-muted-foreground">
          Empieza gratis. Sube cuando lo necesites. Todos los planes incluyen acceso a providers
          verificados y al Plan Anual Eudify.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map(({ name, price, priceNote, period, desc, items, cta, href, variant, featured }, i) => (
            <div
              key={name}
              className={`lp-reveal lp-d${i + 1} relative flex flex-col overflow-hidden rounded-3xl border p-7 transition-all duration-300 hover:-translate-y-1`}
              style={{
                background: featured ? '#fff' : 'var(--background)',
                borderColor: featured ? 'var(--primary)' : 'var(--border)',
                borderWidth: featured ? 2 : 1,
                boxShadow: featured ? '0 12px 40px rgba(41,128,185,.14)' : undefined,
              }}
            >
              {featured && (
                <div
                  className="absolute right-[-24px] top-4 rotate-45 px-9 py-1 text-[10px] font-bold uppercase tracking-wide text-white"
                  style={{ background: 'var(--primary)' }}
                >
                  Más popular
                </div>
              )}
              <div className="mb-2 text-[13px] font-bold uppercase tracking-wide text-muted-foreground">{name}</div>
              <div
                className="mb-1 leading-none"
                style={{
                  fontFamily: 'var(--font-serif, Georgia, serif)',
                  fontSize: 'clamp(36px,4vw,48px)',
                  color: 'var(--navy)',
                }}
              >
                {price}
                <span className="text-base text-muted-foreground" style={{ fontFamily: 'inherit' }}>
                  {priceNote}
                </span>
              </div>
              <div className="mb-4 text-[12px] text-muted-foreground">{period}</div>
              <div className="mb-5 text-[13px] leading-relaxed text-muted-foreground">{desc}</div>
              <div className="mb-6 h-px" style={{ background: 'var(--border)' }} />
              <ul className="mb-6 flex-1 space-y-2">
                {items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[13px] text-muted-foreground">
                    <span style={{ color: 'var(--primary)' }}>→</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href={href}
                className="block rounded-full py-2.5 text-center text-[14px] font-semibold transition-all duration-200"
                style={
                  variant === 'primary'
                    ? { background: 'var(--primary)', color: '#fff' }
                    : {
                        border: '1.5px solid var(--primary)',
                        color: 'var(--primary)',
                        background: 'transparent',
                      }
                }
              >
                {cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-[13px] text-muted-foreground">
          Todos los planes incluyen 14 días de prueba sin compromiso · Sin tarjeta de crédito · Soporte en español
        </p>
      </div>
    </section>
  );
}

// ─── Evidencia científica ─────────────────────────────────────────────────────
function Evidencia() {
  const cards = [
    {
      source: 'Harvard Center on Developing Child',
      quote: '"More than 1 million new neural connections are formed every second in the first few years of life."',
      ref: 'Brain Architecture · developingchild.harvard.edu · Pilar 6 & 7',
    },
    {
      source: 'UNICEF LACRO · 2023',
      quote: '"Solo el 18,6% de los niños de 0 a 2 años en LATAM tiene cobertura en programas de desarrollo infantil temprano."',
      ref: 'Early Childhood Education for All · unicef.org/lac · Todos los pilares',
    },
    {
      source: 'OMS — Nurturing Care Framework · 2018',
      quote: '"Las interacciones responsivas y el entorno seguro en los primeros años son la base del desarrollo cerebral óptimo."',
      ref: 'who.int/publications · Pilar 5 & 6',
    },
    {
      source: 'DANE / Ministerio del Trabajo Colombia · 2024',
      quote: '"Hasta el 80% del trabajo doméstico en Colombia — incluido el cuidado infantil — opera en la informalidad."',
      ref: 'GEIH Nov 2024 · dane.gov.co · Contexto de mercado',
    },
    {
      source: 'AAP — American Academy of Pediatrics · 2022',
      quote: '"Los niños de 6 a 12 años necesitan entre 9 y 11 horas de sueño por noche para el desarrollo cognitivo y emocional óptimo."',
      ref: 'Healthy Sleep Habits · healthychildren.org · Pilar 1, 3 & 6',
    },
    {
      source: 'OMS — Physical Activity Guidelines · 2020',
      quote: '"Los niños de 5 a 17 años deben acumular al menos 60 minutos diarios de actividad física de intensidad moderada a vigorosa."',
      ref: 'who.int/publications · Pilar 7',
    },
  ];

  return (
    <section className="px-6 py-24 sm:px-[max(24px,6vw)]" style={{ background: 'var(--background)' }}>
      <div className="mx-auto max-w-[1180px]">
        <SectionLabel>Base científica</SectionLabel>
        <SectionHeading>
          Cada recomendación tiene<br />
          <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>nombre y apellido</em> científico.
        </SectionHeading>
        <p className="lp-reveal lp-d2 mb-14 max-w-2xl text-[17px] font-light leading-relaxed text-muted-foreground">
          Eudify no inventa afirmaciones. Todo está respaldado por instituciones de salud y desarrollo
          infantil de primer nivel mundial.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ source, quote, ref }, i) => (
            <div
              key={source}
              className={`lp-reveal lp-d${(i % 3) + 1} rounded-2xl border bg-white p-6 transition-colors duration-200 hover:border-primary`}
              style={{ borderColor: 'var(--border)' }}
            >
              <div
                className="mb-3 text-[11px] font-bold uppercase tracking-[1.5px]"
                style={{ color: 'var(--primary)' }}
              >
                {source}
              </div>
              <p className="mb-3 text-[14px] italic leading-relaxed" style={{ color: 'var(--navy)' }}>
                {quote}
              </p>
              <p className="text-[11.5px] text-muted-foreground">{ref}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA Final ────────────────────────────────────────────────────────────────
function CtaFinal() {
  return (
    <section
      className="relative overflow-hidden px-6 py-24 text-center sm:px-[max(24px,6vw)]"
      style={{ background: 'var(--navy)' }}
    >
      {/* watermark */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[320px] font-bold leading-none select-none"
        style={{
          fontFamily: 'var(--font-serif, Georgia, serif)',
          color: 'rgba(41,128,185,.05)',
          letterSpacing: '-10px',
        }}
        aria-hidden="true"
      >
        Eudify
      </div>

      <div className="relative z-10">
        <div
          className="lp-reveal mx-auto mb-6 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[2px]"
          style={{ color: 'var(--accent-hover)' }}
        >
          <span className="h-0.5 w-5" style={{ background: 'var(--accent-hover)' }} />
          Empieza hoy
        </div>
        <h2
          className="lp-reveal lp-d1 mx-auto mb-5 max-w-2xl text-white"
          style={{
            fontFamily: 'var(--font-serif, Georgia, serif)',
            fontSize: 'clamp(36px,5vw,64px)',
            lineHeight: 1.02,
            letterSpacing: '-2px',
          }}
        >
          El desarrollo de tu hijo<br />
          empieza con{' '}
          <em style={{ color: 'var(--accent-hover)', fontStyle: 'italic' }}>una buena decisión.</em>
        </h2>
        <p
          className="lp-reveal lp-d2 mx-auto mb-10 max-w-lg text-[18px] font-light"
          style={{ color: 'rgba(255,255,255,.5)' }}
        >
          Únete a las familias que ya están usando Eudify para conectarse con educadores verificados
          y seguir el Plan Anual basado en evidencia.
        </p>
        <div className="lp-reveal lp-d2 flex flex-wrap justify-center gap-3">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
            style={{ background: 'var(--primary)' }}
          >
            Explorar planes para familias →
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 rounded-full border px-8 py-3.5 text-sm font-medium text-white transition-all hover:bg-white/10"
            style={{ background: 'rgba(255,255,255,.07)', borderColor: 'rgba(255,255,255,.15)' }}
          >
            Registrarme como educador
          </Link>
        </div>
        <p
          className="lp-reveal mt-6 text-[13px]"
          style={{ color: 'rgba(255,255,255,.3)' }}
        >
          Sin tarjeta de crédito · Setup en minutos · Soporte en español
        </p>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer
      className="flex flex-col items-center justify-between gap-5 border-t px-6 py-8 sm:flex-row sm:px-[max(24px,6vw)]"
      style={{ background: 'var(--navy)', borderColor: 'rgba(255,255,255,.07)' }}
    >
      <Link
        href="/"
        className="text-[22px]"
        style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: 'var(--accent-hover)' }}
      >
        Eudify
      </Link>
      <div className="flex flex-wrap justify-center gap-6">
        {([
          { label: 'Familias', href: '/#para-quien' },
          { label: 'Educadores', href: '/#para-quien' },
          { label: 'Empresas', href: '/#para-quien' },
          { label: '7 Pilares', href: '/#pilares' },
          { label: 'Plan Anual', href: '/#plan-anual' },
          { label: 'Privacidad', href: '/privacidad' },
          { label: 'Términos', href: '/terminos' },
        ] as { label: string; href: string }[]).map(({ label, href }) => (
          <Link
            key={label}
            href={href}
            className="text-[13px] transition-colors duration-200 hover:text-white/70"
            style={{ color: 'rgba(255,255,255,.35)' }}
          >
            {label}
          </Link>
        ))}
      </div>
      <div className="text-[12px]" style={{ color: 'rgba(255,255,255,.2)' }}>
        © {new Date().getFullYear()} Velttora LLC · Eudify es un producto de Velttora LLC
      </div>
    </footer>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export function HomeLanding() {
  const ref = useReveal();

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden" ref={ref}>
      <style>{`
        .lp-reveal{opacity:0;transform:translateY(24px);transition:opacity .65s ease,transform .65s ease;}
        .lp-reveal.lp-visible{opacity:1;transform:none;}
        .lp-d1{transition-delay:.1s;}
        .lp-d2{transition-delay:.2s;}
        .lp-d3{transition-delay:.3s;}
        .lp-d4{transition-delay:.4s;}
      `}</style>

      <PublicSiteHeader />
      <main>
        <Hero />
        <Ticker />
        <Problema />
        <Solucion />
        <Pilares />
        <ParaQuien />
        <ComoFunciona />
        <PlanAnual />
        <Precios />
        <Evidencia />
        <CtaFinal />
      </main>
      <Footer />
    </div>
  );
}
