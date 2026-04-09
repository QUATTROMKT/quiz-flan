import React, { useState, useEffect, useRef, useCallback } from 'react';

const CONFIG = {
  hotmartUrl: "https://pay.hotmart.com/F105278692O?checkoutMode=10",
  pitchSeconds: 565,               // tudo aparece após o pitch (565s do vídeo)
  urgencyMinutes: 15,              // timer de urgência (inicia só após o pitch)
  initialVacancies: 23,            // vagas iniciais
  minVacancies: 2,                 // vagas mínimas (nunca chega a 0)
  // PIXEL META: NÃO ATIVADO — será ativado quando o usuário confirmar
  // metaPixelId: "1525719689076260",
};

function trackEvent(eventName, params = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...params });

  if (typeof window.fbq === 'function') {
    window.fbq('trackCustom', eventName, params);
  }

  console.log('[QUIZ TRACK]', eventName, params);
}

const QUESTIONS = [
  {
    progress: 15,
    headline: "¿Cuál de estas situaciones describe mejor tu momento actual?",
    subtitle: "(No hay respuestas incorrectas — esto nos ayuda a personalizar tu plan)",
    options: [
      "🏠 Soy ama de casa y quiero tener MI propio dinero",
      "💼 Trabajo pero el sueldo no me alcanza para todo",
      "😰 Quiero algo extra pero no sé por dónde empezar",
      "✨ Me encanta cocinar y quiero convertirlo en dinero"
    ]
  },
  {
    progress: 30,
    headline: "¿Cuánto tiempo llevas pensando en generar dinero desde casa?",
    subtitle: "(La mayoría de las mujeres llevan más tiempo del que creen...)",
    options: [
      "⏰ Apenas empecé a pensarlo (menos de 1 mes)",
      "📅 Varios meses, pero no he encontrado cómo hacerlo",
      "😤 Más de un año buscando algo que realmente funcione",
      "💔 Ya intenté algo antes, pero no me resultó como esperaba"
    ]
  },
  {
    progress: 45,
    headline: "¿Qué te ha frenado para tener tu propio negocio desde casa?",
    subtitle: "(Esto nos ayuda a personalizar exactamente qué mostrarte)",
    options: [
      "💸 No tengo dinero para invertir en algo grande",
      "🤷 No sé hacer algo que la gente quiera comprar y pagar",
      "📱 No sé cómo conseguir clientes ni vender por redes sociales",
      "😨 Le tengo miedo al fracaso o a perder mi tiempo"
    ]
  },
  {
    progress: 60,
    headline: "Si pudieras ganar $200–$300 dólares extra este mes, ¿qué harías con ese dinero?",
    subtitle: "(Piénsalo de verdad — tu respuesta va a personalizar tu plan)",
    options: [
      "🏥 Pagar deudas, cuentas o gastos del hogar que me preocupan",
      "👨‍👩‍👧 Darles más a mis hijos: ropa, útiles, actividades",
      "🌟 Ahorrar para algo importante: viaje, remodelación, emergencias",
      "💪 Tener MI PROPIO dinero y no depender de nadie más"
    ]
  },
  {
    progress: 75,
    headline: "¿Cómo describirías tu habilidad en la cocina?",
    subtitle: "⚠️ Importante: el Método Flan Sin Horno NO requiere experiencia previa",
    options: [
      "👩‍🍳 Cocino muy bien — me encantan los postres",
      "🙂 Cocino lo básico y me defiendo bien",
      "😅 No cocino mucho, pero aprendería algo sencillo",
      "❓ Nunca he preparado postres, pero me llama la atención"
    ]
  },
  {
    progress: 90,
    headline: "Si te mostramos exactamente cómo hacer flanes que se venden a $5–$15 cada uno desde tu casa... ¿cuándo estarías lista para empezar?",
    subtitle: "(Esta es la respuesta más importante de todo el quiz)",
    options: [
      "🔥 HOY MISMO — estoy lista para comenzar ahora",
      "📆 Esta semana, cuando entienda bien cómo funciona",
      "🤔 Este mes, cuando me sienta más preparada",
      "💭 Todavía no estoy segura, necesito ver más"
    ]
  }
];

const NOTIFICATIONS = [
  "🇲🇽 María G. de México acaba de acceder al método",
  "🇨🇴 Camila R. de Colombia acaba de unirse",
  "🇵🇪 Rosa M. de Perú acaba de comprar",
  "🇨🇱 Valentina S. de Chile acaba de acceder",
  "🇲🇽 Lupita H. de México acaba de comenzar",
  "🇨🇴 Paola V. de Colombia acaba de unirse",
  "🇵🇪 Carmen F. de Perú acaba de comprar",
  "🇲🇽 Diana L. de México acaba de acceder"
];

export default function App() {
  const [screen, setScreen] = useState('start');
  const [currentQ, setCurrentQ] = useState(0);
  const [animatingOut, setAnimatingOut] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);

  // Loading Screen States
  const [loadingText, setLoadingText] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);

  // VSL Screen States
  const [pitchRevealed, setPitchRevealed] = useState(false); // TUDO aparece só após o pitch
  const [ctaVisible, setCtaVisible] = useState(false);
  const [vacancies, setVacancies] = useState(CONFIG.initialVacancies);
  const [timeRemaining, setTimeRemaining] = useState(CONFIG.urgencyMinutes * 60);
  const [currentNotification, setCurrentNotification] = useState('');
  const [notificationVisible, setNotificationVisible] = useState(false);

  const notifIndexRef = useRef(0);
  const notifTimersRef = useRef([]);
  const vacanciesRef = useRef(CONFIG.initialVacancies);
  const ctaRef = useRef(null);

  // Gera os tempos das 21 notificações espalhados organicamente em 565s
  // Cada notificação = -1 vaga. 23 → 2 = 21 notificações.
  const generateNotificationSchedule = useCallback(() => {
    const totalNotifs = CONFIG.initialVacancies - CONFIG.minVacancies; // 21
    const totalTime = CONFIG.pitchSeconds; // 565s
    const times = [];

    // Gera 21 tempos aleatórios entre 10s e 555s, garante espaçamento mínimo
    for (let i = 0; i < totalNotifs; i++) {
      const baseTime = (totalTime / totalNotifs) * i;
      const jitter = (Math.random() - 0.5) * (totalTime / totalNotifs) * 0.6;
      const t = Math.max(10, Math.min(totalTime - 10, baseTime + jitter));
      times.push(Math.round(t));
    }

    // Ordena e garante espaçamento mínimo de 8s entre notificações
    times.sort((a, b) => a - b);
    for (let i = 1; i < times.length; i++) {
      if (times[i] - times[i - 1] < 8) {
        times[i] = times[i - 1] + 8 + Math.floor(Math.random() * 5);
      }
    }

    return times;
  }, []);

  useEffect(() => {
    if (screen === 'start') {
      trackEvent('QuizStart');
    } else if (screen === 'vsl') {
      trackEvent('VSLView');

      // Inject VTurb player script (v4 web component)
      const s = document.createElement('script');
      s.src = 'https://scripts.converteai.net/b6a53cb5-aa1a-47b3-af2b-b93c7fe8b86c/players/69d45bc3ea7d2fe7052ee466/v4/player.js';
      s.async = true;
      document.head.appendChild(s);

      // Agenda 21 notificações espalhadas ao longo dos 565s do vídeo
      // Cada uma diminui 1 vaga. No final = exatamente 2 vagas.
      const schedule = generateNotificationSchedule();
      const timers = schedule.map((timeInSec, i) => {
        return setTimeout(() => {
          const idx = i % NOTIFICATIONS.length;
          setCurrentNotification(NOTIFICATIONS[idx]);
          setNotificationVisible(true);

          // -1 vaga
          vacanciesRef.current = CONFIG.initialVacancies - (i + 1);
          if (vacanciesRef.current < CONFIG.minVacancies) vacanciesRef.current = CONFIG.minVacancies;
          setVacancies(vacanciesRef.current);

          // Esconde após 4s
          setTimeout(() => setNotificationVisible(false), 4000);
        }, timeInSec * 1000);
      });
      notifTimersRef.current = timers;

      // Timer do pitch: após 565 segundos, revela timer + vagas + CTA
      const pitchTimer = setTimeout(() => {
        setPitchRevealed(true);
        setCtaVisible(true);
        trackEvent('CTAVisible', { secondsElapsed: CONFIG.pitchSeconds });
        // Auto-scroll até o CTA no mobile (espera animação de entrada)
        setTimeout(() => {
          if (ctaRef.current) {
            ctaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 700);
      }, CONFIG.pitchSeconds * 1000);

      return () => {
        clearTimeout(pitchTimer);
        notifTimersRef.current.forEach(t => clearTimeout(t));
      };
    }
  }, [screen, generateNotificationSchedule]);

  // Timer de urgência — só conta quando pitchRevealed = true
  useEffect(() => {
    if (!pitchRevealed) return;

    const urgencyTimer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) return CONFIG.urgencyMinutes * 60;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(urgencyTimer);
  }, [pitchRevealed]);

  const handleStart = () => {
    setScreen('quiz');
  };

  const handleOptionClick = (option) => {
    if (selectedOption) return;
    setSelectedOption(option);
    trackEvent('QuizStep', { step: currentQ + 1, answer: option });

    setTimeout(() => {
      if (currentQ < QUESTIONS.length - 1) {
        setAnimatingOut(true);
        setTimeout(() => {
          setCurrentQ(prev => prev + 1);
          setSelectedOption(null);
          setAnimatingOut(false);
        }, 200);
      } else {
        setScreen('loading');
        trackEvent('QuizComplete', { totalSteps: QUESTIONS.length });
        startLoadingSequence();
      }
    }, 400);
  };

  const startLoadingSequence = () => {
    const texts = [
      { t: "⚙️ Analizando tus respuestas...", delay: 0 },
      { t: "📊 Creando tu perfil personalizado...", delay: 800 },
      { t: "🎯 Identificando tu mejor plan...", delay: 1600 },
      { t: "✅ ¡Tu plan está listo!", delay: 2400 }
    ];

    texts.forEach(({ t, delay }) => {
      setTimeout(() => setLoadingText(t), delay);
    });

    let progress = 0;
    const interval = setInterval(() => {
      progress += (100 / (3500 / 50));
      setLoadingProgress(Math.min(progress, 100));
    }, 50);

    setTimeout(() => {
      clearInterval(interval);
      setScreen('vsl');
    }, 3500);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const currentQuestionData = QUESTIONS[currentQ];
  const isUrgent = timeRemaining < 180;

  const inlineStyles = {
    container: {
      minHeight: '100vh',
      minHeight: '100dvh',
      background: 'linear-gradient(135deg, #1a0f08 0%, #2d1a0e 50%, #1a0f08 100%)',
      color: '#fff8f0',
      fontFamily: "'Nunito', system-ui, -apple-system, sans-serif",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '16px',
      boxSizing: 'border-box',
      WebkitOverflowScrolling: 'touch',
    },
    wrapper: {
      width: '100%',
      maxWidth: '480px',
      margin: '0 auto',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      flex: 1
    },
    badge: {
      background: 'rgba(212, 160, 60, 0.15)',
      border: '1px solid rgba(212, 160, 60, 0.3)',
      padding: '8px 16px',
      borderRadius: '99px',
      fontSize: '13px',
      fontWeight: '600',
      marginBottom: '20px',
      display: 'inline-block',
      color: '#d4a03c'
    },
    headline: {
      fontSize: '22px',
      fontWeight: '800',
      lineHeight: '1.3',
      marginBottom: '12px',
    },
    subtitle: {
      fontSize: '15px',
      color: '#c4a882',
      marginBottom: '20px',
      lineHeight: '1.5'
    },
    buttonStart: {
      width: '100%',
      background: 'linear-gradient(90deg, #d4a03c 0%, #b8860b 100%)',
      color: '#1a0f08',
      border: 'none',
      borderRadius: '14px',
      padding: '18px 24px',
      fontSize: '18px',
      fontWeight: '800',
      cursor: 'pointer',
      boxShadow: '0 4px 15px rgba(212, 160, 60, 0.4)',
      marginTop: '16px',
      marginBottom: '12px',
      transition: 'transform 0.15s, opacity 0.15s',
      minHeight: '56px',
      WebkitTapHighlightColor: 'transparent',
    },
    benefitsList: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
      marginBottom: '24px'
    },
    benefitItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '14px',
      fontSize: '15px'
    },
    progressBarBg: {
      height: '6px',
      background: 'rgba(255,255,255,0.1)',
      borderRadius: '3px',
      overflow: 'hidden',
      marginBottom: '8px'
    },
    progressBarFill: {
      height: '100%',
      background: 'linear-gradient(90deg, #d4a03c 0%, #c77b2a 100%)',
      transition: 'width 0.5s ease',
      borderRadius: '3px'
    },
    timerBox: {
      padding: '14px',
      background: 'rgba(0,0,0,0.4)',
      border: `2px solid ${isUrgent ? '#ef4444' : 'rgba(255,255,255,0.2)'}`,
      borderRadius: '10px',
      textAlign: 'center',
      fontWeight: 'bold',
      fontSize: '17px',
      marginTop: '20px',
      marginBottom: '12px',
      animation: isUrgent ? 'pulse-btn-red 1s infinite' : 'none'
    },
    vacanciesBox: {
      padding: '14px',
      background: 'rgba(239, 68, 68, 0.1)',
      borderRadius: '10px',
      textAlign: 'center',
      fontWeight: '600',
      fontSize: '15px',
      color: '#ef4444',
      marginBottom: '20px'
    },
    ctaButton: {
      width: '100%',
      background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '14px',
      padding: '20px 24px',
      fontSize: '17px',
      fontWeight: '800',
      cursor: 'pointer',
      boxShadow: '0 4px 15px rgba(34, 197, 94, 0.4)',
      animation: 'pulse-btn 2s infinite',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '6px',
      minHeight: '64px',
      WebkitTapHighlightColor: 'transparent',
    }
  };

  return (
    <div style={inlineStyles.container}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        /* Mobile-first responsive headline */
        @media (min-width: 480px) {
          .headline-text { font-size: 26px !important; }
        }
        @media (max-width: 360px) {
          .headline-text { font-size: 19px !important; }
        }

        @keyframes pulse-btn {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.6); }
          70% { transform: scale(1.03); box-shadow: 0 0 0 15px rgba(34, 197, 94, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
        @keyframes pulse-btn-red {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        @keyframes flash-red {
          0% { background-color: rgba(239, 68, 68, 0.4); }
          100% { background-color: rgba(239, 68, 68, 0.1); }
        }
        @keyframes slide-in-bottom {
          0% { transform: translateY(100px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
        @keyframes slide-up-fade {
          0% { transform: translateY(20px); opacity: 0; }
          10% { transform: translateY(0); opacity: 1; }
          90% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-20px); opacity: 0; }
        }

        .anim-fade-out {
          opacity: 0;
          transform: translateX(-20px);
          transition: all 200ms ease;
        }
        .anim-fade-in {
          opacity: 1;
          transform: translateX(0);
          transition: all 300ms ease;
        }
        
        .option-btn {
          background: rgba(212, 160, 60, 0.08);
          border: 1px solid rgba(212, 160, 60, 0.2);
          border-radius: 12px;
          padding: 14px 16px;
          color: #fff8f0;
          text-align: left;
          font-size: 15px;
          font-family: 'Nunito', system-ui, sans-serif;
          cursor: pointer;
          transition: all 0.15s ease;
          min-height: 52px;
          width: 100%;
          margin-bottom: 10px;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        .option-btn:hover {
          background: rgba(212, 160, 60, 0.18);
          border-color: #d4a03c;
        }
        .option-btn:active {
          transform: scale(0.98);
          background: rgba(212, 160, 60, 0.25);
          border-color: #d4a03c;
        }
        .option-btn.selected {
          background: linear-gradient(90deg, #d4a03c, #c77b2a);
          border-color: rgba(255, 248, 240, 0.8);
          color: #1a0f08;
          box-shadow: 0 0 15px rgba(212, 160, 60, 0.4);
          transform: scale(1);
        }

        .notif-popup {
          position: fixed;
          bottom: calc(80px + env(safe-area-inset-bottom, 0px));
          left: 50%;
          transform: translateX(-50%);
          width: 92%;
          max-width: 400px;
          background: #fff8f0;
          color: #3d2814;
          border-radius: 12px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.5);
          z-index: 50;
          animation: slide-up-fade 4000ms forwards;
          font-size: 13px;
          font-weight: 600;
          font-family: 'Nunito', system-ui, sans-serif;
        }

        .pitch-reveal-enter {
          animation: slide-in-bottom 0.6s ease-out forwards;
        }

        /* VTurb player responsive */
        vturb-smartplayer {
          display: block !important;
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 auto !important;
          border-radius: 8px;
          overflow: hidden;
        }
      `}</style>
      
      <div style={inlineStyles.wrapper}>
        
        {/* START SCREEN */}
        {screen === 'start' && (
          <div style={{ marginTop: '4vh' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={inlineStyles.badge}>🍮 Quiz de Personalización Gratuito</div>
            </div>
            <h1 className="headline-text" style={inlineStyles.headline}>
              ¿Sabías que miles de mujeres ya generan ingresos vendiendo postres caseros?
            </h1>
            <p style={inlineStyles.subtitle}>
              Responde 6 preguntas rápidas y descubre si este método es para ti — adaptado a tu situación.
            </p>
            
            <ul style={inlineStyles.benefitsList}>
              <li style={inlineStyles.benefitItem}><span>✅</span> Solo toma 2 minutos</li>
              <li style={inlineStyles.benefitItem}><span>✅</span> 100% gratis</li>
              <li style={inlineStyles.benefitItem}><span>✅</span> Recibes un plan personalizado</li>
            </ul>

            <button 
              style={inlineStyles.buttonStart} 
              onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
              onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              onClick={handleStart}
            >
              Comenzar Quiz Gratis →
            </button>
            <p style={{ textAlign: 'center', color: '#c4a882', fontSize: '12px' }}>
              🔒 Tus respuestas son privadas y confidenciales
            </p>
          </div>
        )}

        {/* QUIZ SCREEN */}
        {screen === 'quiz' && (
          <div style={{ marginTop: '2vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#d4a03c', fontWeight: 'bold' }}>
              <span style={{ color: '#d4a03c' }}>Pregunta {currentQ + 1} de {QUESTIONS.length}</span>
              <span style={{ color: '#d4a03c' }}>{currentQuestionData.progress}%</span>
            </div>
            <div style={inlineStyles.progressBarBg}>
              <div style={{ ...inlineStyles.progressBarFill, width: `${currentQuestionData.progress}%` }}></div>
            </div>

            <div className={animatingOut ? "anim-fade-out" : "anim-fade-in"} style={{ marginTop: '32px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>
                {currentQuestionData.headline}
              </h2>
              <p style={{ color: '#c4a882', fontSize: '14px', marginBottom: '24px' }}>
                {currentQuestionData.subtitle}
              </p>

              <div>
                {currentQuestionData.options.map((option, idx) => (
                  <button
                    key={idx}
                    className={`option-btn ${selectedOption === option ? 'selected' : ''}`}
                    onClick={() => handleOptionClick(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* LOADING SCREEN */}
        {screen === 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '60vh' }}>
            <div style={{ 
              width: '60px', height: '60px', 
              border: '4px solid rgba(255,255,255,0.1)', 
              borderTopColor: '#d4a03c', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite',
              marginBottom: '32px'
            }}></div>
            
            <h2 style={{ fontSize: '20px', fontWeight: '600', minHeight: '30px', textAlign: 'center', marginBottom: '24px' }}>
              {loadingText}
            </h2>
            
            <div style={{ width: '100%', maxWidth: '300px' }}>
              <div style={inlineStyles.progressBarBg}>
                <div style={{ ...inlineStyles.progressBarFill, width: `${loadingProgress}%` }}></div>
              </div>
              <div style={{ textAlign: 'center', color: '#d4a03c', fontWeight: 'bold', marginTop: '8px' }}>
                {Math.floor(loadingProgress)}%
              </div>
            </div>
          </div>
        )}

        {/* VSL SCREEN */}
        {screen === 'vsl' && (
          <div style={{ marginTop: '2vh' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <span style={{ background: 'rgba(212, 160, 60, 0.15)', color: '#d4a03c', padding: '4px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: '700' }}>
                🔒 Acceso exclusivo para tu perfil
              </span>
            </div>
            <h2 className="headline-text" style={{ fontSize: '22px', fontWeight: '800', textAlign: 'center', marginBottom: '12px' }}>
              ¡Encontramos exactamente lo que necesitas!
            </h2>
            <p style={{ textAlign: 'center', color: '#c4a882', marginBottom: '24px', fontSize: '15px' }}>
              Basándonos en tus respuestas, preparamos algo especial para ti. Mira este video completo:
            </p>

            {/* VTurb Player v4 Web Component */}
            {/* VTurb Player — full width on mobile */}
            <div style={{ width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
              <vturb-smartplayer
                id="vid-69d45bc3ea7d2fe7052ee466"
                style={{ display: 'block', width: '100%' }}
              />
            </div>

            {/* === TUDO ABAIXO APARECE SÓ APÓS O PITCH (565s) === */}
            {pitchRevealed && (
              <div className="pitch-reveal-enter">
                <div style={inlineStyles.timerBox}>
                  ⏰ Esta oferta expira en: {formatTime(timeRemaining)}
                </div>

                <div key={vacancies} style={{ ...inlineStyles.vacanciesBox, animation: 'flash-red 0.5s ease' }}>
                  🔴 Solo quedan {vacancies} lugares disponibles a este precio
                </div>

                {ctaVisible && (
                  <div ref={ctaRef} style={{ animation: 'slide-in-bottom 0.5s ease-out forwards', marginTop: '8px' }}>
                    <button 
                      style={inlineStyles.ctaButton}
                      onClick={() => {
                        trackEvent('CTAClick');
                        window.open(CONFIG.hotmartUrl, '_blank');
                      }}
                    >
                      <span style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        👉 QUIERO ACCEDER AL MÉTODO AHORA
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: '500', opacity: 0.9 }}>
                        🔒 Acceso inmediato • Garantía de 7 días
                      </span>
                    </button>
                    
                    <p style={{ textAlign: 'center', fontSize: '14px', marginTop: '16px', color: '#e5e7eb' }}>
                      ⭐⭐⭐⭐⭐ Más de 3.400 mujeres ya aprendieron el método
                    </p>
                  </div>
                )}

                <p style={{ textAlign: 'center', fontSize: '12px', color: '#ef4444', marginTop: '32px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                  ⚠️ Atención: Esta oferta especial para participantes del quiz vence hoy a las 23:59
                </p>
              </div>
            )}

            {/* Notificação flutuante — aparece desde o início da VSL */}
            {notificationVisible && (
              <div className="notif-popup">
                <div style={{ background: '#22c55e', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                  ✓
                </div>
                <span>{currentNotification}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
