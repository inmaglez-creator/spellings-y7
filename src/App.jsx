import { useState, useRef, useEffect } from "react";

// ─── KS3 OFFICIAL SPELLING LIST ─────────────────────────────────────────────
const WORD_GROUPS = [
  {
    id: "general_a",
    label: "General Words A–L",
    icon: "🔤",
    color: "#7C3AED",
    light: "#F5F3FF",
    words: ["accommodation","actually","alcohol","although","analyse","analysis","argument","assessment","atmosphere","audible","audience","autumn","beautiful","beginning","believe","beneath","buried","business","caught","chocolate","climb","column","concentration","conclusion","conscience","conscious","consequence","continuous","creation","daughter","decide","decision","definite","design","development","diamond","diary","disappear","disappoint","embarrass","energy","engagement","enquire","environment","evaluation","evidence","explanation","February","fierce","forty","fulfil","furthermore","guard","happened","health","height","imaginary","improvise","industrial","interesting","interrupt","issue","jealous","knowledge","listening","lonely","lovely"],
  },
  {
    id: "general_b",
    label: "General Words M–Z",
    icon: "🔡",
    color: "#0369A1",
    light: "#F0F9FF",
    words: ["marriage","material","meanwhile","miscellaneous","mischief","modern","moreover","murmur","necessary","nervous","original","outrageous","parallel","participation","pattern","peaceful","people","performance","permanent","persuade","persuasion","physical","possession","potential","preparation","prioritise","process","proportion","proposition","questionnaire","queue","reaction","receive","reference","relief","remember","research","resources","safety","Saturday","secondary","separate","sequence","shoulder","sincerely","skilful","soldier","stomach","straight","strategy","strength","success","surely","surprise","survey","technique","technology","texture","tomorrow","unfortunately","Wednesday","weight","weird","women"],
  },
  {
    id: "homophones",
    label: "Homophones & Confusions",
    icon: "🔀",
    color: "#BE185D",
    light: "#FDF2F8",
    words: ["advise","advice","affect","effect","allowed","aloud","bought","brought","choose","chose","conscience","conscious","course","coarse","practise","practice","quiet","quite","threw","through","their","there","they're","to","too","two","your","you're","its","it's","where","wear","were","we're"],
  },
  {
    id: "english_vocab",
    label: "English Subject Words",
    icon: "✍️",
    color: "#059669",
    light: "#ECFDF5",
    words: ["alliteration","apostrophe","atmosphere","clause","cliché","conjunction","consonant","dialogue","exclamation","figurative","genre","grammar","imagery","metaphor","narrative","narrator","onomatopoeia","paragraph","personification","playwright","prefix","preposition","resolution","rhyme","simile","soliloquy","subordinate","suffix","synonym","vocabulary","vowel"],
  },
  {
    id: "subject_words",
    label: "Geography & History Words",
    icon: "🌍",
    color: "#92400E",
    light: "#FFFBEB",
    words: ["agriculture","agricultural","bias","chronology","chronological","civilisation","colonisation","constitution","contradict","defence","dynasty","emigration","government","imperialism","independence","parliament","propaganda","rebellion","revolution","siege","atmosphere","climate","contour","erosion","estuary","habitat","infrastructure","latitude","longitude","pollution","settlement","tourism","transport"],
  },
];

const SYSTEM_PROMPT = `You are a friendly KS3 English spelling tutor for an 11-year-old entering Year 7 at a British curriculum school.

Your role: help students practise and master their KS3 spelling list through varied, engaging exercises.

Exercise types you use (vary them):
1. DICTATION: Give a sentence using the target word. Ask the student to type the word correctly.
2. DEFINITION MATCH: Give the definition, ask them to spell the word.
3. FILL THE GAP: Give a sentence with a missing word (first letter as hint), ask them to complete it.
4. SPOT THE ERROR: Write the word incorrectly, ask them to correct it.
5. HOMOPHONES: Give context sentences, ask them to choose/spell the correct form.

When generating exercises:
- Take ONE word at a time and create a single exercise for it. After the student answers, correct it, then move to the next word.
- Mix exercise types — never repeat the same type twice in a row
- Number clearly: 1. 2. 3. 4. 5.
- For homophones topics, always give context sentences showing both/all forms
- Add 💡 Tips at the end (memory tricks, etymology hints)

When correcting:
- ✅ correct or ❌ wrong per answer
- For wrong answers: show correct spelling + a memory tip (e.g. "Remember: there's a RAT in separate!")
- Celebrate streaks — praise consecutive correct answers
- End with: "Ready for the next 5?" to keep momentum

Always use British English spelling conventions.

IMPORTANT FORMATTING RULE: Never use markdown. No asterisks, no hashtags, no backticks. Plain text only. Use numbered lists and emoji where helpful.`;

export default function SpellingsApp() {
  const [activeGroup, setActiveGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("home");
  const [wordCount, setWordCount] = useState(0);
  const [visitas, setVisitas] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  useEffect(() => {
    fetch("/api/visitas")
      .then((r) => r.json())
      .then((d) => setVisitas(d.visitas))
      .catch(() => {});
  }, []);

  const startPractice = async (group) => {
    setActiveGroup(group);
    setMessages([]);
    setMode("chat");
    setLoading(true);
    setWordCount(0);

    const sample = group.words.slice(0, 20).join(", ");
    const initMsg = `Generate 1 spelling exercise using one word from this KS3 list: ${sample}. Pick a single word and create one exercise. Student: age 11, entering Y7.`;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: initMsg }],
        }),
      });
      const data = await res.json();
      setMessages([{ role: "assistant", content: data.content?.[0]?.text || "Something went wrong." }]);
      setWordCount(5);
    } catch {
      setMessages([{ role: "assistant", content: "Connection error. Please try again." }]);
    }
    setLoading(false);
  };

  const sendMessage = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg || loading) return;
    setInput("");
    const newMessages = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    // If asking for more, pick next batch of words
    const isMore = userMsg.toLowerCase().includes("more") || userMsg.toLowerCase().includes("next") || userMsg === "Next 5 words";
    const offset = Math.floor(wordCount / 5) * 5 % activeGroup.words.length;
    const nextWords = activeGroup.words.slice(offset, offset + 20).join(", ");

    const apiMessages = newMessages.map((m) => ({ role: m.role, content: m.content }));
    if (isMore) {
      apiMessages[apiMessages.length - 1] = {
        role: "user",
        content: `Generate 1 more spelling exercise. Use a word from: ${nextWords}. Vary the exercise type from the last one.`,
      };
      setWordCount(w => w + 5);
    } else {
      apiMessages[0] = {
        role: "user",
        content: `Spelling topic: ${activeGroup.label}\nWord list: ${activeGroup.words.slice(0, 20).join(", ")}\n\n${apiMessages[0].content}`,
      };
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: apiMessages,
        }),
      });
      const data = await res.json();
      setMessages([...newMessages, { role: "assistant", content: data.content?.[0]?.text || "Something went wrong." }]);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Connection error." }]);
    }
    setLoading(false);
  };

  // HOME
  if (mode === "home") return (
    <div style={{ minHeight: "100vh", background: "#F5F3FF", fontFamily: "'Segoe UI', system-ui, sans-serif", padding: "24px 16px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🔤</div>
          <a href="https://y7-hub.vercel.app/" style={{ position: "fixed", top: 12, left: 12, zIndex: 50, background: "#fff", color: "#475569", textDecoration: "none", fontWeight: 700, fontSize: 13, padding: "6px 12px", borderRadius: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.12)", border: "1px solid #e5e7eb" }}>← Hub</a>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "#3B0764", margin: 0 }}>KS3 Spellings</h1>
          <p style={{ color: "#6B7280", marginTop: 6, fontSize: 14 }}>Official KS3 word list · Varied exercises · Instant feedback</p>
          <div style={{ display: "inline-block", background: "#7C3AED", color: "#fff", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700, marginTop: 6 }}>
            {WORD_GROUPS.reduce((a, g) => a + g.words.length, 0)} words total
          </div>
        </div>

        {WORD_GROUPS.map((group) => (
          <div key={group.id} style={{ background: "#fff", borderRadius: 16, marginBottom: 14, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: `2px solid ${group.light}` }}>
            <div style={{ background: group.light, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 26 }}>{group.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: group.color }}>{group.label}</div>
                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{group.words.length} words</div>
              </div>
              <button onClick={() => startPractice(group)} style={{ background: group.color, color: "#fff", border: "none", borderRadius: 20, padding: "7px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Practise →
              </button>
            </div>
            {/* Word preview */}
            <div style={{ padding: "10px 18px 14px", display: "flex", flexWrap: "wrap", gap: 6 }}>
              {group.words.slice(0, 8).map(w => (
                <span key={w} style={{ background: group.light, color: group.color, fontSize: 11, fontWeight: 600, borderRadius: 8, padding: "2px 8px" }}>{w}</span>
              ))}
              <span style={{ fontSize: 11, color: "#9CA3AF", padding: "2px 4px" }}>+{group.words.length - 8} more</span>
            </div>
          </div>
        ))}

        <div style={{ background: "#FEF9C3", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#713F12", border: "1.5px solid #FDE68A", marginTop: 8 }}>
          💡 <strong>Look, Cover, Write, Check:</strong> The most effective spelling strategy — look at the word, cover it, write it from memory, then check!
        </div>
        {visitas !== null && (
          <div style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: "#9CA3AF" }}>
            Visitas: {visitas}
          </div>
        )}
      </div>
    </div>
  );

  // CHAT
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: activeGroup.light, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ background: activeGroup.color, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <button onClick={() => setMode("home")} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>← Back</button>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{activeGroup.icon} {activeGroup.label}</div>
          <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 11 }}>{activeGroup.words.length} words · {wordCount} practised</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px", maxWidth: 680, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 14, display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            {msg.role === "assistant" && (
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: activeGroup.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, marginRight: 8, flexShrink: 0, alignSelf: "flex-end" }}>🔤</div>
            )}
            <div style={{ background: msg.role === "user" ? activeGroup.color : "#fff", color: msg.role === "user" ? "#fff" : "#1F2937", borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", padding: "10px 14px", maxWidth: "82%", fontSize: 13.5, lineHeight: 1.65, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", whiteSpace: "pre-wrap" }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: activeGroup.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🔤</div>
            <div style={{ background: "#fff", borderRadius: "16px 16px 16px 4px", padding: "10px 14px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <div style={{ display: "flex", gap: 4 }}>{[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: activeGroup.color, animation: "bounce 1s infinite", animationDelay: `${i*0.2}s` }} />)}</div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: "6px 16px 0", maxWidth: 680, margin: "0 auto", width: "100%", display: "flex", gap: 6, flexWrap: "wrap", boxSizing: "border-box" }}>
        {["Hint", "Next word", "Give me a memory tip", "Harder exercises"].map(q => (
          <button key={q} onClick={() => sendMessage(q)} style={{ background: "#fff", color: activeGroup.color, border: `1.5px solid ${activeGroup.color}40`, borderRadius: 14, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{q}</button>
        ))}
      </div>

      <div style={{ padding: "10px 16px 16px", maxWidth: 680, margin: "0 auto", width: "100%", display: "flex", gap: 8, boxSizing: "border-box" }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Type your spelling answers here..." style={{ flex: 1, border: "2px solid #E5E7EB", borderRadius: 22, padding: "9px 16px", fontSize: 13.5, outline: "none", fontFamily: "inherit" }} onFocus={e => e.target.style.borderColor = activeGroup.color} onBlur={e => e.target.style.borderColor = "#E5E7EB"} />
        <button onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{ background: activeGroup.color, color: "#fff", border: "none", borderRadius: "50%", width: 42, height: 42, fontSize: 18, cursor: loading ? "not-allowed" : "pointer", opacity: loading || !input.trim() ? 0.45 : 1, flexShrink: 0 }}>↑</button>
      </div>
      <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }`}</style>
    </div>
  );
}
