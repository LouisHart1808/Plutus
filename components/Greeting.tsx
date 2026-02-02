"use client";

import { useEffect, useState } from "react";
import { getGreetingSGT } from "../lib/time";

export default function Greeting() {
  const [greeting, setGreeting] = useState(() => getGreetingSGT(new Date()));

  useEffect(() => {
    const updateGreeting = () => setGreeting(getGreetingSGT(new Date()));
    updateGreeting();

    const id = setInterval(updateGreeting, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return <>{greeting}</>;
}
