import { useEffect, useState } from "react";

export default function App() {
  const [dogY, setDogY] = useState(0);
  const [isJumping, setIsJumping] = useState(false);
  const [obstacleX, setObstacleX] = useState(1000);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    if (gameOver) return;

    const obstacleTimer = setInterval(() => {
      setObstacleX((prev) => {
        if (prev < -60) {
          return window.innerWidth > 768 ? 1000 : 700;
        }
        return prev - 12;
      });
    }, 20);

    const scoreTimer = setInterval(() => {
      setScore((prev) => prev + 1);
    }, 100);

    return () => {
      clearInterval(obstacleTimer);
      clearInterval(scoreTimer);
    };
  }, [gameOver]);

  useEffect(() => {
    if (obstacleX > 80 && obstacleX < 180 && dogY < 80) {
      setGameOver(true);
    }
  }, [obstacleX, dogY]);

  const jump = () => {
    if (isJumping || gameOver) return;

    setIsJumping(true);

    let height = 0;
    let goingUp = true;

    const jumpTimer = setInterval(() => {
      if (goingUp) {
        height += 10;
        setDogY(height);

        if (height >= 150) {
          goingUp = false;
        }
      } else {
        height -= 10;
        setDogY(height);

        if (height <= 0) {
          clearInterval(jumpTimer);
          setDogY(0);
          setIsJumping(false);
        }
      }
    }, 20);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        (e.code === "Space" || e.code === "ArrowUp") &&
        !isJumping &&
        !gameOver
      ) {
        jump();
      }

      if (e.code === "KeyR" && gameOver) {
        window.location.reload();
      }
    };

    const handleTouch = () => {
      if (gameOver) {
        window.location.reload();
      } else if (!isJumping) {
        jump();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("touchstart", handleTouch);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("touchstart", handleTouch);
    };
  }, [isJumping, gameOver]);

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        background: "#d7ecff",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        padding: "10px",
        boxSizing: "border-box",
      }}
    >
      <div
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
          borderRadius: "16px",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "20px",
            fontSize: "clamp(18px, 3vw, 32px)",
            fontWeight: "bold",
            zIndex: 10,
          }}
        >
          Score: {score}
        </div>

        {gameOver && (
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
              }}
            >
              Game Over
            </h1>

            <p
              style={{
                fontSize: "clamp(16px, 4vw, 24px)",
                color: "white",
                marginTop: "10px",
              }}
            >
              Tap Screen or Press R to Restart
            </p>
          </div>
        )}

        <img
          src="/sandy-runner-game/dog.png"
          alt="Dog"
          style={{
            position: "absolute",
            left: "8%",
            bottom: `${60 + dogY}px`,
            width: "clamp(70px, 12vw, 110px)",
            imageRendering: "pixelated",
            zIndex: 5,
            userSelect: "none",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: `${obstacleX}px`,
            bottom: "60px",
            width: "clamp(30px, 5vw, 40px)",
            height: "clamp(60px, 10vw, 80px)",
            background: "#7a1f1f",
            border: "3px solid black",
            zIndex: 4,
          }}
        />

        <div
          style={{
            position: "absolute",
            bottom: "0",
            left: "0",
            width: "100%",
            height: "60px",
            background: "#4c9a2a",
            borderTop: "4px solid black",
          }}
        />
      </div>
    </div>
  );
}