// Voice command definitions for all supported languages.
// Each command has a set of phrases the user might say and an action identifier.

// Map our language codes to BCP-47 locale codes for SpeechRecognition / SpeechSynthesis
export const LANG_LOCALE: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  ta: "ta-IN",
  te: "te-IN",
};

export type VoiceAction =
  | "nav:discover"
  | "nav:sell"
  | "nav:inquiries"
  | "nav:signin"
  | "nav:signup"
  | "chat:open"
  | "chat:close"
  | "scroll:top"
  | "scroll:catalogue"
  | "search:focus"
  | "help";

export type VoiceCommand = {
  action: VoiceAction;
  phrases: string[]; // lowercase match phrases
};

// Feedback messages spoken back to the user after a command fires
export const VOICE_FEEDBACK: Record<VoiceAction, Record<string, string>> = {
  "nav:discover":    { en: "Opening Discover",         hi: "खोजें खुल रहा है",          ta: "கண்டறிகிறோம்",         te: "కనుగొంటున్నాము" },
  "nav:sell":        { en: "Opening For Artisans",      hi: "कारीगर अनुभाग खुल रहा है", ta: "கலைஞர் பகுதி திறக்கிறது", te: "కళాకారుల విభాగం తెరవబడుతోంది" },
  "nav:inquiries":   { en: "Opening Enquiries",         hi: "पूछताछ खुल रही है",         ta: "விசாரணைகள் திறக்கின்றன",  te: "విచారణలు తెరవబడుతున్నాయి" },
  "nav:signin":      { en: "Going to Sign In",          hi: "साइन इन पेज खुल रहा है",   ta: "உள்நுழைவு பக்கம்",       te: "సైన్ ఇన్ పేజీకి వెళ్తున్నాము" },
  "nav:signup":      { en: "Going to Sign Up",          hi: "साइन अप पेज खुल रहा है",   ta: "பதிவு பக்கம்",            te: "సైన్ అప్ పేజీకి వెళ్తున్నాము" },
  "chat:open":       { en: "Opening buyer guide",       hi: "खरीदार मार्गदर्शक खुल रहा है", ta: "வாங்குபவர் வழிகாட்டி திறக்கிறது", te: "కొనుగోలుదారు మార్గదర్శి తెరవబడుతోంది" },
  "chat:close":      { en: "Closing buyer guide",       hi: "मार्गदर्शक बंद हो रहा है",  ta: "வழிகாட்டி மூடுகிறது",    te: "మార్గదర్శి మూసివేయబడుతోంది" },
  "scroll:top":      { en: "Going to top",              hi: "ऊपर जा रहे हैं",            ta: "மேலே செல்கிறோம்",        te: "పైకి వెళ్తున్నాము" },
  "scroll:catalogue":{ en: "Going to catalogue",        hi: "सूची पर जा रहे हैं",        ta: "பட்டியலுக்கு செல்கிறோம்", te: "జాబితాకు వెళ్తున్నాము" },
  "search:focus":    { en: "Search box ready",          hi: "खोज बॉक्स तैयार है",        ta: "தேடல் பெட்டி தயார்",      te: "శోధన పెట్టె సిద్ధంగా ఉంది" },
  "help":            { en: "Available commands: Discover, Artisans, Enquiries, Search, Top, Chat", hi: "उपलब्ध आदेश: खोजें, कारीगर, पूछताछ, खोज, ऊपर, चैट", ta: "கட்டளைகள்: கண்டறி, கலைஞர், விசாரணை, தேடு, மேல், அரட்டை", te: "ఆదేశాలు: కనుగొను, కళాకారుడు, విచారణ, వెతకు, పైకి, చాట్" },
};

export const VOICE_COMMANDS: Record<string, VoiceCommand[]> = {
  en: [
    { action: "nav:discover",     phrases: ["discover", "home", "go home", "show products", "browse", "marketplace"] },
    { action: "nav:sell",         phrases: ["sell", "artisan", "for artisans", "create listing", "add product", "list product"] },
    { action: "nav:inquiries",    phrases: ["enquiries", "inquiries", "messages", "orders", "my orders"] },
    { action: "nav:signin",       phrases: ["sign in", "login", "log in", "signin"] },
    { action: "nav:signup",       phrases: ["sign up", "register", "create account", "join", "join kaari"] },
    { action: "chat:open",        phrases: ["open chat", "open guide", "buyer guide", "ask about cost", "cost estimate", "price estimate"] },
    { action: "chat:close",       phrases: ["close chat", "close guide", "hide chat"] },
    { action: "scroll:top",       phrases: ["go to top", "scroll up", "top of page", "back to top"] },
    { action: "scroll:catalogue", phrases: ["go to catalogue", "show catalogue", "scroll down", "show products", "catalogue"] },
    { action: "search:focus",     phrases: ["search", "find", "look for", "search for"] },
    { action: "help",             phrases: ["help", "commands", "what can i say", "voice commands"] },
  ],
  hi: [
    { action: "nav:discover",     phrases: ["खोजें", "होम", "घर जाएं", "उत्पाद दिखाएं", "ब्राउज़ करें"] },
    { action: "nav:sell",         phrases: ["बेचें", "कारीगर", "कारीगरों के लिए", "लिस्टिंग बनाएं", "उत्पाद जोड़ें"] },
    { action: "nav:inquiries",    phrases: ["पूछताछ", "संदेश", "ऑर्डर", "मेरे ऑर्डर"] },
    { action: "nav:signin",       phrases: ["साइन इन", "लॉगिन", "लॉग इन"] },
    { action: "nav:signup",       phrases: ["साइन अप", "रजिस्टर", "खाता बनाएं", "जुड़ें"] },
    { action: "chat:open",        phrases: ["चैट खोलें", "मार्गदर्शक खोलें", "लागत पूछें", "कीमत पूछें"] },
    { action: "chat:close",       phrases: ["चैट बंद करें", "मार्गदर्शक बंद करें"] },
    { action: "scroll:top",       phrases: ["ऊपर जाएं", "शीर्ष पर जाएं", "वापस ऊपर"] },
    { action: "scroll:catalogue", phrases: ["सूची पर जाएं", "उत्पाद दिखाएं", "नीचे स्क्रॉल करें"] },
    { action: "search:focus",     phrases: ["खोजें", "ढूंढें", "खोज करें"] },
    { action: "help",             phrases: ["मदद", "सहायता", "कमांड", "क्या बोलूं"] },
  ],
  ta: [
    { action: "nav:discover",     phrases: ["கண்டறி", "முகப்பு", "தயாரிப்புகள்", "உலாவு"] },
    { action: "nav:sell",         phrases: ["விற்க", "கலைஞர்", "கலைஞர்களுக்கு", "பட்டியல் உருவாக்கு"] },
    { action: "nav:inquiries",    phrases: ["விசாரணை", "செய்திகள்", "ஆர்டர்கள்"] },
    { action: "nav:signin",       phrases: ["உள்நுழை", "லாகின்"] },
    { action: "nav:signup",       phrases: ["பதிவு செய்", "கணக்கு உருவாக்கு", "சேர்"] },
    { action: "chat:open",        phrases: ["அரட்டை திற", "வழிகாட்டி திற", "விலை கேள்"] },
    { action: "chat:close",       phrases: ["அரட்டை மூடு", "வழிகாட்டி மூடு"] },
    { action: "scroll:top",       phrases: ["மேலே செல்", "மேற்கு செல்"] },
    { action: "scroll:catalogue", phrases: ["பட்டியலுக்கு செல்", "தயாரிப்புகள் காட்டு"] },
    { action: "search:focus",     phrases: ["தேடு", "தேட"] },
    { action: "help",             phrases: ["உதவி", "கட்டளைகள்"] },
  ],
  te: [
    { action: "nav:discover",     phrases: ["కనుగొను", "హోమ్", "ఉత్పత్తులు చూపు", "బ్రౌజ్ చేయి"] },
    { action: "nav:sell",         phrases: ["అమ్ము", "కళాకారుడు", "కళాకారులకు", "జాబితా సృష్టించు"] },
    { action: "nav:inquiries",    phrases: ["విచారణలు", "సందేశాలు", "ఆర్డర్లు"] },
    { action: "nav:signin",       phrases: ["సైన్ ఇన్", "లాగిన్"] },
    { action: "nav:signup",       phrases: ["సైన్ అప్", "నమోదు", "చేరు"] },
    { action: "chat:open",        phrases: ["చాట్ తెరువు", "మార్గదర్శి తెరువు", "ధర అడుగు"] },
    { action: "chat:close",       phrases: ["చాట్ మూసివేయి", "మార్గదర్శి మూసివేయి"] },
    { action: "scroll:top",       phrases: ["పైకి వెళ్ళు", "పైన వెళ్ళు"] },
    { action: "scroll:catalogue", phrases: ["జాబితాకు వెళ్ళు", "ఉత్పత్తులు చూపు"] },
    { action: "search:focus",     phrases: ["వెతుకు", "శోధించు"] },
    { action: "help",             phrases: ["సహాయం", "ఆదేశాలు"] },
  ],
};

export function matchCommand(transcript: string, lang: string): VoiceAction | null {
  const commands = VOICE_COMMANDS[lang] ?? VOICE_COMMANDS["en"];
  const lower = transcript.toLowerCase().trim();
  for (const cmd of commands) {
    for (const phrase of cmd.phrases) {
      if (lower.includes(phrase)) return cmd.action;
    }
  }
  return null;
}
