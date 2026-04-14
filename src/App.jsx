import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================
// CONFIG
// ============================================================
const CONFIG = {
  pixelId: '1525719689076260',  // FIX 11: Centralizado no CONFIG
  hotmartUrl: "https://pay.hotmart.com/F105278692O?checkoutMode=10",
  pitchSeconds: 565,               // tudo aparece após o pitch (565s do vídeo) — NÃO ALTERAR
  urgencyMinutes: 15,              // timer de urgência (inicia só após o pitch)
  initialVacancies: 23,            // vagas iniciais
  minVacancies: 2,                 // vagas mínimas (nunca chega a 0)
};

// ============================================================
// FIX 11 — PIXEL SYSTEM — Fora do componente React
// ============================================================
const pixelEventQueue = [];
let pixelInitialized = false;

function flushPixelQueue() {
  while (pixelEventQueue.length > 0) {
    const { eventName, params } = pixelEventQueue.shift();
    if (typeof window.fbq === 'function') {
      window.fbq('trackCustom', eventName, params);
    }
  }
}

function initPixel(pixelId) {
  // Se fbq já existe (pixel no index.html carregou), apenas registrar
  if (typeof window.fbq === 'function') {
    pixelInitialized = true;
    flushPixelQueue();
    return;
  }

  // Injetar pixel programaticamente via document.body (mais confiável em WebView)
  !function(f,b,e,v,n,t,s){
    if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s);
  }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');

  window.fbq('init', pixelId);
  window.fbq('track', 'PageView');

  // Aguardar fbevents.js carregar para fazer flush da fila
  const checkReady = setInterval(() => {
    if (typeof window.fbq === 'function' && window.fbq.loaded) {
      clearInterval(checkReady);
      pixelInitialized = true;
      flushPixelQueue();
    }
  }, 100);

  // Timeout de segurança: após 5 segundos, tentar flush mesmo assim
  setTimeout(() => {
    clearInterval(checkReady);
    if (!pixelInitialized) {
      pixelInitialized = true;
      flushPixelQueue();
    }
  }, 5000);
}

// ============================================================
// FIX 11 — trackEvent atualizado com fila
// ============================================================
function trackEvent(eventName, params = {}) {
  // GTM dataLayer sempre funciona (não depende de fbq)
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...params });

  // Meta Pixel — usar fila se pixel ainda não carregou
  if (typeof window.fbq === 'function') {
    window.fbq('trackCustom', eventName, params);
  } else {
    // Enfileirar para disparar quando pixel estiver pronto
    pixelEventQueue.push({ eventName, params });
  }

  // FIX 6: Log apenas em dev
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
    console.log('[QUIZ TRACK]', eventName, params);
  }
}



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
  const [screen, setScreen] = useState('vsl');

  // VSL Screen States
  const [pitchRevealed, setPitchRevealed] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);
  const [vacancies, setVacancies] = useState(CONFIG.initialVacancies);
  const [timeRemaining, setTimeRemaining] = useState(CONFIG.urgencyMinutes * 60);
  const [currentNotification, setCurrentNotification] = useState('');
  const [notificationVisible, setNotificationVisible] = useState(false);

  // FIX 3 — Ref síncrono para evitar race condition no auto-advance
  const isAdvancingRef = useRef(false);

  const notifTimersRef = useRef([]);
  const vacanciesRef = useRef(CONFIG.initialVacancies);
  const ctaRef = useRef(null);

  // Gera os tempos das 21 notificações espalhados organicamente em 565s
  const generateNotificationSchedule = useCallback(() => {
    const totalNotifs = CONFIG.initialVacancies - CONFIG.minVacancies;
    const totalTime = CONFIG.pitchSeconds;
    const times = [];

    for (let i = 0; i < totalNotifs; i++) {
      const baseTime = (totalTime / totalNotifs) * i;
      const jitter = (Math.random() - 0.5) * (totalTime / totalNotifs) * 0.6;
      const t = Math.max(10, Math.min(totalTime - 10, baseTime + jitter));
      times.push(Math.round(t));
    }

    times.sort((a, b) => a - b);
    for (let i = 1; i < times.length; i++) {
      if (times[i] - times[i - 1] < 8) {
        times[i] = times[i - 1] + 8 + Math.floor(Math.random() * 5);
      }
    }

    return times;
  }, []);

  // ============================================================
  // MAIN EFFECT — screen changes
  // ============================================================
  useEffect(() => {
    // FIX 2 — QuizStart REMOVIDO daqui (movido para handleStart)

    if (screen === 'loading') {
      // Preload VTurb resources during the loading animation
      const vturbPreloads = [
        { href: 'https://scripts.converteai.net/b6a53cb5-aa1a-47b3-af2b-b93c7fe8b86c/players/69d45bc3ea7d2fe7052ee466/v4/player.js', as: 'script' },
        { href: 'https://scripts.converteai.net/lib/js/smartplayer-wc/v4/smartplayer.js', as: 'script' },
        { href: 'https://cdn.converteai.net/b6a53cb5-aa1a-47b3-af2b-b93c7fe8b86c/69d459b584e8b7c72282687c/main.m3u8', as: 'fetch' },
      ];
      vturbPreloads.forEach(({ href, as }) => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = href;
        link.as = as;
        if (as === 'fetch') link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      });

      const plt = document.createElement('script');
      plt.textContent = '!function(i,n){i._plt=i._plt||(n&&n.timeOrigin?n.timeOrigin+n.now():Date.now())}(window,performance);';
      document.head.appendChild(plt);
    } else if (screen === 'vsl') {
      trackEvent('VSLView');

      // FIX 8 — Injetar VTurb script via document.body (mais compatível com WebView)
      if (!document.querySelector('script[data-id="69d45bc3ea7d2fe7052ee466"]')) {
        const s = document.createElement('script');
        s.src = 'https://scripts.converteai.net/b6a53cb5-aa1a-47b3-af2b-b93c7fe8b86c/players/69d45bc3ea7d2fe7052ee466/v4/player.js';
        s.setAttribute('data-id', '69d45bc3ea7d2fe7052ee466');
        s.async = true;
        document.body.appendChild(s); // body, não head — mais compatível com WebView
      }

      // Agenda 21 notificações espalhadas ao longo dos 565s do vídeo
      const schedule = generateNotificationSchedule();
      const timers = schedule.map((timeInSec, i) => {
        return setTimeout(() => {
          const idx = i % NOTIFICATIONS.length;
          setCurrentNotification(NOTIFICATIONS[idx]);
          setNotificationVisible(true);

          vacanciesRef.current = CONFIG.initialVacancies - (i + 1);
          if (vacanciesRef.current < CONFIG.minVacancies) vacanciesRef.current = CONFIG.minVacancies;
          setVacancies(vacanciesRef.current);

          setTimeout(() => setNotificationVisible(false), 4000);
        }, timeInSec * 1000);
      });
      notifTimersRef.current = timers;

      // Timer do pitch: após pitchSeconds, revela timer + vagas + CTA — NÃO ALTERAR
      const pitchTimer = setTimeout(() => {
        setPitchRevealed(true);
        setCtaVisible(true);
        trackEvent('CTAVisible', { secondsElapsed: CONFIG.pitchSeconds });
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

  // FIX 11 — initPixel como PRIMEIRA coisa no mount
  useEffect(() => {
    initPixel(CONFIG.pixelId);
  }, []);

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



  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };
  const isUrgent = timeRemaining < 180;

  // ============================================================
  // FIX 1 — Background bege quente + cores atualizadas
  // FIX 7 — Legibilidade mobile (fonte, espaçamento, touch targets)
  // ============================================================
  const inlineStyles = {
    container: {
      minHeight: '100vh',
      minHeight: '100dvh',
      background: '#f7f3ee', // FIX 1: bege quente
      color: '#2d1b0e',      // FIX 1: texto escuro
      fontFamily: "'Nunito', system-ui, -apple-system, sans-serif",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px 20px', // FIX 7: padding mínimo 20px
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
      background: '#d63031', // FIX 1: badge vermelho
      border: 'none',
      padding: '8px 16px',
      borderRadius: '99px',
      fontSize: '13px',
      fontWeight: '700',
      marginBottom: '20px',
      display: 'inline-block',
      color: '#ffffff' // FIX 1: branco sobre vermelho
    },
    headline: {
      fontSize: 'clamp(18px, 4.5vw, 22px)', // FIX 7: responsivo
      fontWeight: '800',
      lineHeight: '1.4', // FIX 7
      marginBottom: '12px',
      color: '#2d1b0e',
    },
    subtitle: {
      fontSize: '15px',
      color: '#6b4c38', // FIX 1: legível em fundo claro
      marginBottom: '20px',
      lineHeight: '1.5'
    },
    buttonStart: {
      width: '100%',
      background: 'linear-gradient(135deg, #d63031, #c0392b)', // FIX 1: vermelho
      color: '#ffffff',
      border: 'none',
      borderRadius: '14px',
      padding: '18px 24px',
      fontSize: '18px',
      fontWeight: '800',
      cursor: 'pointer',
      boxShadow: '0 6px 24px rgba(214,48,49,0.35)', // FIX 1
      marginTop: '16px',
      marginBottom: '12px',
      transition: 'transform 0.15s, opacity 0.15s',
      minHeight: '60px', // FIX 7: touch target
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
      fontSize: '15px',
      color: '#3d2b1f', // FIX 1
    },
    progressBarBg: {
      height: '10px', // FIX 7: mais visível (era 6px)
      background: 'rgba(0,0,0,0.08)', // FIX 1: fundo claro
      borderRadius: '5px',
      overflow: 'hidden',
      marginBottom: '8px'
    },
    progressBarFill: {
      height: '100%',
      background: 'linear-gradient(90deg, #d63031, #ff7675)', // FIX 1: vermelho
      transition: 'width 0.5s ease',
      borderRadius: '5px'
    },
    timerBox: {
      padding: '14px',
      background: 'rgba(0,0,0,0.06)', // FIX 1
      border: `2px solid ${isUrgent ? '#ef4444' : '#e0d4ca'}`,
      borderRadius: '10px',
      textAlign: 'center',
      fontWeight: 'bold',
      fontSize: '17px',
      color: '#2d1b0e', // FIX 1
      marginTop: '20px',
      marginBottom: '12px',
      animation: isUrgent ? 'pulse-btn-red 1s infinite' : 'none'
    },
    vacanciesBox: {
      padding: '14px',
      background: 'rgba(239, 68, 68, 0.08)', // FIX 1
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
        
        /* FIX 7: Mobile-first responsive headline */
        @media (min-width: 480px) {
          .headline-text { font-size: 26px !important; }
        }
        @media (max-width: 360px) {
          .headline-text { font-size: 18px !important; }
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
          0% { background-color: rgba(239, 68, 68, 0.15); }
          100% { background-color: rgba(239, 68, 68, 0.08); }
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
          transition: all 150ms ease;
        }
        .anim-fade-in {
          opacity: 1;
          transform: translateX(0);
          transition: all 250ms ease;
        }
        
        /* FIX 1 + FIX 7: option-btn com cores claras e touch targets maiores */
        .option-btn {
          background: #ffffff;
          border: 2px solid #e0d4ca;
          border-radius: 12px;
          padding: 16px 18px;
          color: #3d2b1f;
          text-align: left;
          font-size: 15px;
          font-family: 'Nunito', system-ui, sans-serif;
          cursor: pointer;
          transition: all 0.15s ease;
          min-height: 60px;
          width: 100%;
          margin-bottom: 10px;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          line-height: 1.4;
          display: flex;
          align-items: center;
        }
        .option-btn:hover {
          background: #fff5f5;
          border-color: #d63031;
        }
        .option-btn:active {
          transform: scale(0.98);
          background: #fff0f0;
          border-color: #d63031;
        }
        /* FIX 1: estado selecionado */
        .option-btn.selected {
          background: linear-gradient(135deg, #fff0f0, #ffe8e8);
          border-color: #d63031;
          color: #c0392b;
          box-shadow: 0 0 12px rgba(214, 48, 49, 0.15);
          transform: scale(1);
        }

        /* FIX 10: safe-area-inset para notificações */
        .notif-popup {
          position: fixed;
          bottom: max(20px, env(safe-area-inset-bottom));
          left: 50%;
          transform: translateX(-50%);
          width: 92%;
          max-width: 400px;
          background: #ffffff;
          color: #3d2b1f;
          border-radius: 12px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
          z-index: 50;
          animation: slide-up-fade 4000ms forwards;
          font-size: 13px;
          font-weight: 600;
          font-family: 'Nunito', system-ui, sans-serif;
          border: 1px solid #e0d4ca;
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
        


        {/* VSL SCREEN — FIX 1: cores claras */}
        {screen === 'vsl' && (
          <div style={{ marginTop: '2vh' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <span style={{ background: 'rgba(214, 48, 49, 0.1)', color: '#d63031', padding: '4px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: '700' }}>
                🔴 Revelado: El método paso a paso
              </span>
            </div>
            <h2 className="headline-text" style={{ fontSize: 'clamp(18px, 4.5vw, 22px)', fontWeight: '800', textAlign: 'center', marginBottom: '12px', color: '#2d1b0e', lineHeight: '1.4' }}>
              Descubre cómo generar $200–$300 dólares extra al mes vendiendo deliciosos postres desde casa
            </h2>
            <p style={{ textAlign: 'center', color: '#6b4c38', marginBottom: '24px', fontSize: '15px' }}>
              Sube el volumen y mira este breve video hasta el final para entender cómo funciona:
            </p>

            {/* VTurb Player v4 Web Component */}
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
                    
                    <p style={{ textAlign: 'center', fontSize: '14px', marginTop: '16px', color: '#3d2b1f' }}>
                      ⭐⭐⭐⭐⭐ Más de 3.400 mujeres ya aprendieron el método
                    </p>
                  </div>
                )}

                <p style={{ textAlign: 'center', fontSize: '12px', color: '#ef4444', marginTop: '32px', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '16px' }}>
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
