export function CrossBlock({ bgColor = "#FF93F0", patternColor = "#FB439B", size = 232 }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size, backgroundColor: bgColor }}>
      <div className="absolute" style={{ left: "43.25%", right: "43.25%", top: "0%", bottom: "49.52%", backgroundColor: patternColor }} />
      <div className="absolute" style={{ left: "43.25%", right: "43.25%", top: "49.51%", bottom: "0%", backgroundColor: patternColor }} />
      <div className="absolute" style={{ left: "49.52%", right: "0%", top: "43.25%", bottom: "43.25%", backgroundColor: patternColor }} />
      <div className="absolute" style={{ left: "0%", right: "49.52%", top: "43.25%", bottom: "43.25%", backgroundColor: patternColor }} />
      <div className="absolute" style={{ left: "49.66%", right: "12.6%", top: "12.68%", bottom: "49.67%", backgroundColor: patternColor }} />
      <div className="absolute" style={{ left: "12.68%", right: "49.66%", top: "49.66%", bottom: "12.6%", backgroundColor: patternColor }} />
      <div className="absolute" style={{ left: "49.66%", right: "12.6%", top: "49.66%", bottom: "12.6%", backgroundColor: patternColor }} />
      <div className="absolute" style={{ left: "12.68%", right: "49.66%", top: "12.68%", bottom: "49.67%", backgroundColor: patternColor }} />
    </div>
  );
}

export function QuadrantBlock({ bgColor = "#FF6602", patternColor = "#F6C847", size = 232 }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size, backgroundColor: bgColor }}>
      <div className="absolute" style={{ left: "50%", right: "0%", top: "50%", bottom: "-0.1%", backgroundColor: patternColor }} />
      <div className="absolute" style={{ left: "50%", right: "0%", top: "-0.1%", bottom: "50%", backgroundColor: patternColor }} />
      <div className="absolute" style={{ left: "0%", right: "50%", top: "-0.1%", bottom: "50%", backgroundColor: patternColor }} />
      <div className="absolute" style={{ left: "0%", right: "50%", top: "50%", bottom: "-0.1%", backgroundColor: patternColor }} />
    </div>
  );
}
