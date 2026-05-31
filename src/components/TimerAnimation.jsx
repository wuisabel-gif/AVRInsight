import { motion } from "framer-motion";

export default function TimerAnimation({ pin }) {
  if (!pin.timers?.length && !pin.pwm) {
    return (
      <section className="detail-card">
        <h3>Timer View</h3>
        <p className="muted">This pin does not expose a timer compare or PWM output role in the sample dataset.</p>
      </section>
    );
  }

  const timer = pin.timers[0];
  const caption = pin.pwm
    ? `${timer.name} drives ${pin.id} by counting, comparing, and toggling the output waveform.`
    : `${timer.name} can still be related to capture, compare, or counting behavior on this pin.`;

  return (
    <section className="detail-card">
      <h3>Timer / PWM Animation</h3>
      <div className="timer-demo">
        <div className="counter-lane">
          <span>TCNT</span>
          <div className="counter-track">
            <motion.div
              className="counter-progress"
              animate={{ width: ["0%", "72%", "0%"] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="compare-marker">{timer.compareRegister || "TOP"}</div>
          </div>
        </div>

        <div className="pulse-flow">
          {[timer.name, timer.channel || "Compare", pin.id].map((step, index) => (
            <div className="pulse-segment" key={step}>
              <motion.div
                className="pulse-node"
                animate={{ opacity: [0.55, 1, 0.55], scale: [1, 1.05, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, delay: index * 0.25 }}
              >
                {step}
              </motion.div>
              {index < 2 ? <div className="pulse-arrow" /> : null}
            </div>
          ))}
        </div>

        <motion.div
          className="pwm-lamp"
          aria-label="PWM output glow preview"
          animate={{
            boxShadow: [
              "0 0 0 rgba(185,255,77,0.18)",
              "0 0 28px rgba(185,255,77,0.8)",
              "0 0 0 rgba(185,255,77,0.18)",
            ],
            opacity: [0.42, 1, 0.42],
          }}
          transition={{ duration: 1.25, repeat: Infinity }}
        />
      </div>
      <p className="muted">{caption}</p>
    </section>
  );
}
