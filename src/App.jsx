import { useCallback, useEffect, useRef, useState } from "react";

const HIGH_SCORE_KEY = "sandy-runner-high-score";
const SKY_DAY = [215, 236, 255];
const SKY_DUSK = [255, 210, 158];
const SKY_CYCLE = 900; // score units per half day/dusk cycle

let obstacleUid = 0;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function skyColorForScore(score) {
  const t = (score % (SKY_CYCLE * 2)) / SKY_CYCLE;
  const mix = t < 1 ? t : 2 - t;
  const [r1, g1, b1] = SKY_DAY;
  const [r2, g2, b2] = SKY_DUSK;
  return `rgb(${lerp(r1, r2, mix) | 0}, ${lerp(g1, g2, mix) | 0}, ${lerp(b1, b2, mix) | 0})`;
}

function useBeep() {
  const ctxRef = useRef(null);

  return useCallback((freq, duration, type = "sine", volume = 0.15) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!ctxRef.current) ctxRef.current = new AudioCtx();
      const ctx = ctxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = volume;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Web Audio unavailable (e.g. autoplay policy) — fail silently.
    }
  }, []);
}

const isMobile = () => window.innerWidth < 768;
const dogLeft = () => (isMobile() ? 40 : 80);
const dogWidth = () => (isMobile() ? 55 : 85);
const dogHeight = () => (isMobile() ? 55 : 75);

const SPRITE_URL = "/sandy-runner-game/dog-sprites.png";
const SPRITE_COLS = 4;
const SPRITE_ASPECT = 380 / 319;
const JUMP_FRAME = 2; // running row, the fully-extended leap pose

function framePosition(col, row) {
  return {
    x: `${(col / (SPRITE_COLS - 1)) * 100}%`,
    y: `${row * 100}%`,
  };
}

export default function App() {
  const [dogY, setDogY] = useState(0);
  const [obstacles, setObstacles] = useState([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState("ready"); // ready | playing | over
  const [shaking, setShaking] = useState(false);
  const [toast, setToast] = useState(null);

  const containerRef = useRef(null);
  const velocityRef = useRef(0);
  const dogYRef = useRef(0);
  const obstaclesRef = useRef([]);
  const scoreRef = useRef(0);
  const speedRef = useRef(6.5);
  const distanceSinceSpawnRef = useRef(0);
  const nextGapRef = useRef(300);
  const totalDistanceRef = useRef(0);
  const milestoneRef = useRef(0);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(null);
  const toastTimeoutRef = useRef(null);

  const beep = useBeep();

  useEffect(() => {
    const stored = Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0;
    setHighScore(stored);
  }, []);

  const resetGame = useCallback(() => {
    dogYRef.current = 0;
    velocityRef.current = 0;
    scoreRef.current = 0;
    speedRef.current = isMobile() ? 5 : 6.5;
    distanceSinceSpawnRef.current = 0;
    nextGapRef.current = 260 + Math.random() * 200;
    totalDistanceRef.current = 0;
    milestoneRef.current = 0;
    lastTimeRef.current = null;
    obstaclesRef.current = [];
    clearTimeout(toastTimeoutRef.current);

    setDogY(0);
    setObstacles([]);
    setScore(0);
    setShaking(false);
    setToast(null);
    setGameState("playing");
  }, []);

  const jump = useCallback(() => {
    if (dogYRef.current > 0 || gameState !== "playing") return;
    velocityRef.current = isMobile() ? 13 : 16;
    beep(520, 0.09, "square", 0.12);
  }, [gameState, beep]);

  // Main game loop
  useEffect(() => {
    if (gameState !== "playing") return;

    const gravity = isMobile() ? 0.7 : 0.85;

    const step = (time) => {
      if (lastTimeRef.current === null) lastTimeRef.current = time;
      const dt = Math.min((time - lastTimeRef.current) / 16.67, 3);
      lastTimeRef.current = time;

      velocityRef.current -= gravity * dt;
      dogYRef.current = Math.max(0, dogYRef.current + velocityRef.current * dt);
      if (dogYRef.current === 0) velocityRef.current = 0;
      setDogY(dogYRef.current);

      const maxSpeed = isMobile() ? 11 : 15;
      const baseSpeed = isMobile() ? 5 : 6.5;
      speedRef.current = Math.min(baseSpeed + scoreRef.current / 250, maxSpeed);

      distanceSinceSpawnRef.current += speedRef.current * dt;
      totalDistanceRef.current += speedRef.current * dt;

      const containerWidth = containerRef.current?.clientWidth || 1000;

      let list = obstaclesRef.current
        .map((o) => ({ ...o, x: o.x - speedRef.current * dt }))
        .filter((o) => o.x > -80);

      if (distanceSinceSpawnRef.current > nextGapRef.current) {
        distanceSinceSpawnRef.current = 0;
        nextGapRef.current = (isMobile() ? 220 : 280) + Math.random() * 220;

        const roll = Math.random();
        const width = isMobile() ? 22 : 32;
        const height =
          roll < 0.25
            ? isMobile() ? 70 : 100
            : roll < 0.55
              ? isMobile() ? 40 : 55
              : isMobile() ? 52 : 72;

        list = [
          ...list,
          { id: obstacleUid++, x: containerWidth + 50, width, height },
        ];
      }

      obstaclesRef.current = list;
      setObstacles(list);

      scoreRef.current += dt * 0.6;
      const newScore = Math.floor(scoreRef.current);
      setScore(newScore);

      if (Math.floor(newScore / 200) > milestoneRef.current) {
        milestoneRef.current = Math.floor(newScore / 200);
        beep(880, 0.12, "sine", 0.1);
        setToast(`🔥 ${newScore} points!`);
        clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => setToast(null), 1200);
      }

      const dLeft = dogLeft();
      const dRight = dLeft + dogWidth();
      const dTop = dogYRef.current + dogHeight();
      const dBottom = dogYRef.current;

      const hit = list.some((o) => {
        const oLeft = o.x;
        const oRight = o.x + o.width;
        return dRight > oLeft && dLeft < oRight && dBottom < o.height && dTop > 0;
      });

      if (hit) {
        beep(120, 0.3, "sawtooth", 0.2);
        setShaking(true);
        setTimeout(() => setShaking(false), 300);

        const stored = Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0;
        if (newScore > stored) {
          localStorage.setItem(HIGH_SCORE_KEY, String(newScore));
          setHighScore(newScore);
        }
        setGameState("over");
        return;
      }

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameState, beep]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        if (gameState === "playing") jump();
        else resetGame();
      }
      if (e.code === "KeyR" && gameState === "over") resetGame();
    };

    const handlePress = () => {
      if (gameState === "playing") jump();
      else resetGame();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("touchstart", handlePress);
    window.addEventListener("mousedown", handlePress);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("touchstart", handlePress);
      window.removeEventListener("mousedown", handlePress);
    };
  }, [gameState, jump, resetGame]);

  useEffect(() => () => clearTimeout(toastTimeoutRef.current), []);

  const sky = skyColorForScore(score);
  const grounded = dogY === 0;

  const baseSpeed = isMobile() ? 5 : 6.5;
  const currentSpeed = Math.min(baseSpeed + score / 250, isMobile() ? 11 : 15);
  const runDuration = Math.max(0.22, 0.5 * (baseSpeed / currentSpeed));

  let spritePos;
  let spriteAnimating;
  let spriteDuration;

  if (gameState === "playing" && !grounded) {
    spritePos = framePosition(JUMP_FRAME, 1);
    spriteAnimating = false;
    spriteDuration = 0.5;
  } else if (gameState === "playing") {
    spritePos = framePosition(0, 1);
    spriteAnimating = true;
    spriteDuration = runDuration;
  } else {
    spritePos = framePosition(0, 0);
    spriteAnimating = gameState === "ready";
    spriteDuration = 0.7;
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        background: sky,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        padding: "10px",
        boxSizing: "border-box",
        transition: "background 0.6s linear",
      }}
    >
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translate(0, 0); }
          20% { transform: translate(-8px, 4px); }
          40% { transform: translate(8px, -4px); }
          60% { transform: translate(-6px, -2px); }
          80% { transform: translate(6px, 2px); }
        }
        @keyframes sprite-cycle-x {
          from { background-position-x: 0%; }
          to { background-position-x: 100%; }
        }
        @keyframes cloud-drift {
          from { transform: translateX(0); }
          to { transform: translateX(-1200px); }
        }
        @keyframes toast-pop {
          0% { transform: translate(-50%, 10px); opacity: 0; }
          15% { transform: translate(-50%, 0); opacity: 1; }
          85% { transform: translate(-50%, 0); opacity: 1; }
          100% { transform: translate(-50%, -10px); opacity: 0; }
        }
      `}</style>

      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "1000px",
          height: "70vh",
          maxHeight: "400px",
          minHeight: "300px",
          background: "#f4f4f4",
          border: "4px solid black",
          overflow: "hidden",
          borderRadius: "20px",
          animation: shaking ? "shake 0.3s" : "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          {[
            { top: 30, size: 40, duration: 38 },
            { top: 70, size: 26, duration: 52 },
            { top: 50, size: 32, duration: 65 },
          ].map((c, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: c.top,
                left: "100%",
                width: c.size * 2,
                height: c.size * 0.6,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.75)",
                boxShadow: `${c.size * 0.7}px ${c.size * 0.15}px 0 -2px rgba(255,255,255,0.75), ${-c.size * 0.6}px ${c.size * 0.1}px 0 -4px rgba(255,255,255,0.6)`,
                animation: `cloud-drift ${c.duration}s linear infinite`,
                animationDelay: `${-i * 15}s`,
              }}
            />
          ))}
        </div>

        <div
          style={{
            position: "absolute",
            top: "15px",
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: "clamp(20px, 4vw, 36px)",
            fontWeight: "bold",
            color: "#333",
            zIndex: 10,
          }}
        >
          Go, Sandy, Go!
        </div>

        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "20px",
            fontSize: "clamp(18px, 3vw, 32px)",
            fontWeight: "bold",
            color: "#666",
            zIndex: 10,
          }}
        >
          Score: {score}
        </div>

        <div
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            fontSize: "clamp(12px, 2vw, 18px)",
            fontWeight: "bold",
            color: "#666",
            zIndex: 10,
          }}
        >
          Best: {highScore}
        </div>

        {toast && (
          <div
            style={{
              position: "absolute",
              top: "70px",
              left: "50%",
              zIndex: 10,
              fontSize: "clamp(14px, 2.5vw, 22px)",
              fontWeight: "bold",
              color: "#c9750a",
              animation: "toast-pop 1.2s ease-out",
            }}
          >
            {toast}
          </div>
        )}

        {gameState === "ready" && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
              zIndex: 20,
              background: "rgba(0,0,0,0.6)",
              padding: "20px 30px",
              borderRadius: "20px",
            }}
          >
            <h1
              style={{
                fontSize: "clamp(28px, 7vw, 56px)",
                margin: 0,
                color: "white",
                lineHeight: 1,
              }}
            >
              Ready, Sandy?
            </h1>
            <p
              style={{
                fontSize: "clamp(16px, 4vw, 24px)",
                color: "white",
                marginTop: "10px",
              }}
            >
              Tap Screen or Press Space to Start
            </p>
            {highScore > 0 && (
              <p style={{ color: "#ffd27f", marginTop: "6px", fontSize: "clamp(14px, 3vw, 18px)" }}>
                Best: {highScore}
              </p>
            )}
          </div>
        )}

        {gameState === "over" && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
              zIndex: 20,
              background: "rgba(0,0,0,0.6)",
              padding: "20px 30px",
              borderRadius: "20px",
            }}
          >
            <h1
              style={{
                fontSize: "clamp(32px, 8vw, 64px)",
                margin: 0,
                color: "white",
                lineHeight: 1,
              }}
            >
              Game Over
            </h1>
            <p style={{ fontSize: "clamp(16px, 4vw, 24px)", color: "white", marginTop: "10px" }}>
              Score: {score} {score >= highScore && score > 0 ? "— New Best!" : `· Best: ${highScore}`}
            </p>
            <p
              style={{
                fontSize: "clamp(14px, 3vw, 20px)",
                color: "white",
                marginTop: "10px",
              }}
            >
              Tap Screen or Press Space to Restart
            </p>
          </div>
        )}

        <div
          style={{
            position: "absolute",
            left: dogLeft(),
            bottom: "46px",
            width: dogWidth(),
            height: "10px",
            borderRadius: "50%",
            background: "rgba(0,0,0,0.25)",
            filter: "blur(1px)",
            transform: `scale(${1 - Math.min(dogY / 150, 0.6)})`,
            zIndex: 4,
          }}
        />

        <div
          role="img"
          aria-label="Sandy the dog"
          style={{
            position: "absolute",
            left: dogLeft(),
            bottom: `${50 + dogY}px`,
            width: "clamp(105px, 17vw, 165px)",
            aspectRatio: `${SPRITE_ASPECT}`,
            backgroundImage: `url(${SPRITE_URL})`,
            backgroundSize: "400% 200%",
            backgroundRepeat: "no-repeat",
            backgroundPositionX: spritePos.x,
            backgroundPositionY: spritePos.y,
            imageRendering: "pixelated",
            zIndex: 5,
            userSelect: "none",
            pointerEvents: "none",
            animationName: spriteAnimating ? "sprite-cycle-x" : "none",
            animationDuration: `${spriteDuration}s`,
            animationTimingFunction: `steps(${SPRITE_COLS - 1})`,
            animationIterationCount: "infinite",
          }}
        />

        {obstacles.map((o) => (
          <div
            key={o.id}
            style={{
              position: "absolute",
              left: `${o.x}px`,
              bottom: "50px",
              width: `${o.width}px`,
              height: `${o.height}px`,
              background: o.height > (isMobile() ? 60 : 85) ? "#5e1414" : o.height > (isMobile() ? 44 : 62) ? "#8b1e1e" : "#c94f4f",
              border: "3px solid black",
              borderRadius: "6px 6px 0 0",
              zIndex: 4,
            }}
          />
        ))}

        <div
          style={{
            position: "absolute",
            bottom: "0",
            left: "0",
            width: "100%",
            height: "50px",
            background: "#4c9a2a",
            borderTop: "4px solid black",
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(0,0,0,0.08) 0 20px, transparent 20px 40px)",
            backgroundPositionX: `${-(totalDistanceRef.current % 40)}px`,
          }}
        />
      </div>
    </div>
  );
}
