import { useState, useEffect } from 'react'

export default function CountUp({ target, duration = 1400 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target == null) return;
    let raf, start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(p * target));
      if (p < 1) raf = requestAnimationFrame(step);
      else setVal(target);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return <>{val}</>;
}
