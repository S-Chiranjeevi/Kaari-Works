// Voice command definitions for all supported languages.

export const LANG_LOCALE: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  ta: "ta-IN",
  te: "te-IN",
  kn: "kn-IN",
};

export type VoiceAction =
  | "nav:buy"
  | "nav:sell"
  | "nav:orders"
  | "nav:enquiry"
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
  phrases: string[];
};

export const VOICE_FEEDBACK: Record<VoiceAction, Record<string, string>> = {
  "nav:buy":         { en: "Opening Buy",       hi: "खरीदें खुल रहा है",        ta: "வாங்குதல் திறக்கிறது",      te: "కొనుగోలు తెరవబడుతోంది",       kn: "ಖರೀದಿ ತೆರೆಯಲಾಗುತ್ತಿದೆ" },
  "nav:sell":        { en: "Opening Sell",       hi: "बेचें खुल रहा है",          ta: "விற்பனை திறக்கிறது",         te: "అమ్మకం తెరవబడుతోంది",         kn: "ಮಾರಾಟ ತೆರೆಯಲಾಗುತ್ತಿದೆ" },
  "nav:orders":      { en: "Opening Orders",     hi: "ऑर्डर खुल रहे हैं",         ta: "ஆர்டர்கள் திறக்கின்றன",      te: "ఆర్డర్లు తెరవబడుతున్నాయి",    kn: "ಆರ್ಡರ್ಗಳು ತೆರೆಯಲಾಗುತ್ತಿದೆ" },
  "nav:enquiry":     { en: "Opening Enquiries",  hi: "पूछताछ खुल रही है",          ta: "விசாரணைகள் திறக்கின்றன",     te: "విచారణలు తెరవబడుతున్నాయి",    kn: "ವಿಚಾರಣೆಗಳು ತೆರೆಯಲಾಗುತ್ತಿದೆ" },
  "nav:signin":      { en: "Going to Sign In",   hi: "साइन इन पेज खुल रहा है",    ta: "உள்நுழைவு பக்கம்",           te: "సైన్ ఇన్ పేజీకి వెళ్తున్నాము", kn: "ಸೈನ್ ಇನ್ ಪುಟಕ್ಕೆ ಹೋಗುತ್ತಿದ್ದೇವೆ" },
  "nav:signup":      { en: "Going to Sign Up",   hi: "साइन अप पेज खुल रहा है",    ta: "பதிவு பக்கம்",                te: "సైన్ అప్ పేజీకి వెళ్తున్నాము", kn: "ಸೈನ್ ಅಪ್ ಪುಟಕ್ಕೆ ಹೋಗುತ್ತಿದ್ದೇವೆ" },
  "chat:open":       { en: "Opening buyer guide", hi: "खरीदार मार्गदर्शक खुल रहा है", ta: "வாங்குபவர் வழிகாட்டி திறக்கிறது", te: "కొనుగోలుదారు మార్గదర్శి తెరవబడుతోంది", kn: "ಖರೀದಿದಾರ ಮಾರ್ಗದರ್ಶಿ ತೆರೆಯಲಾಗುತ್ತಿದೆ" },
  "chat:close":      { en: "Closing buyer guide", hi: "मार्गदर्शक बंद हो रहा है",  ta: "வழிகாட்டி மூடுகிறது",         te: "మార్గదర్శి మూసివేయబడుతోంది",  kn: "ಮಾರ್ಗದರ್ಶಿ ಮುಚ್ಚಲಾಗುತ್ತಿದೆ" },
  "scroll:top":      { en: "Going to top",        hi: "ऊपर जा रहे हैं",            ta: "மேலே செல்கிறோம்",             te: "పైకి వెళ్తున్నాము",            kn: "ಮೇಲೆ ಹೋಗುತ್ತಿದ್ದೇವೆ" },
  "scroll:catalogue":{ en: "Going to catalogue",  hi: "सूची पर जा रहे हैं",        ta: "பட்டியலுக்கு செல்கிறோம்",    te: "జాబితాకు వెళ్తున్నాము",        kn: "ಪಟ್ಟಿಗೆ ಹೋಗುತ್ತಿದ್ದೇವೆ" },
  "search:focus":    { en: "Search box ready",    hi: "खोज बॉक्स तैयार है",        ta: "தேடல் பெட்டி தயார்",          te: "శోధన పెట్టె సిద్ధంగా ఉంది",   kn: "ಹುಡುಕಾಟ ಪೆಟ್ಟಿಗೆ ಸಿದ್ಧವಾಗಿದೆ" },
  "help":            { en: "Commands: Buy, Sell, Orders, Enquiry, Search, Top, Chat", hi: "आदेश: खरीदें, बेचें, ऑर्डर, पूछताछ, खोज, ऊपर, चैट", ta: "கட்டளைகள்: வாங்கு, விற்க, ஆர்டர், விசாரணை, தேடு, மேல், அரட்டை", te: "ఆదేశాలు: కొనండి, అమ్మండి, ఆర్డర్లు, విచారణ, వెతుకు, పైకి, చాట్", kn: "ಆದೇಶಗಳು: ಖರೀದಿ, ಮಾರಾಟ, ಆರ್ಡರ್, ವಿಚಾರಣೆ, ಹುಡುಕು, ಮೇಲೆ, ಚಾಟ್" },
};

export const VOICE_COMMANDS: Record<string, VoiceCommand[]> = {
  en: [
    { action: "nav:buy",          phrases: ["buy", "discover", "home", "shop", "browse", "marketplace", "products"] },
    { action: "nav:sell",         phrases: ["sell", "artisan", "for artisans", "create listing", "add product", "list product"] },
    { action: "nav:orders",       phrases: ["orders", "my orders", "order history"] },
    { action: "nav:enquiry",      phrases: ["enquiry", "enquiries", "inquiry", "inquiries", "messages", "conversations"] },
    { action: "nav:signin",       phrases: ["sign in", "login", "log in", "signin"] },
    { action: "nav:signup",       phrases: ["sign up", "register", "create account", "join", "join kaari"] },
    { action: "chat:open",        phrases: ["open chat", "open guide", "buyer guide", "ask about cost", "cost estimate", "price estimate"] },
    { action: "chat:close",       phrases: ["close chat", "close guide", "hide chat"] },
    { action: "scroll:top",       phrases: ["go to top", "scroll up", "top of page", "back to top"] },
    { action: "scroll:catalogue", phrases: ["catalogue", "go to catalogue", "show catalogue", "scroll down"] },
    { action: "search:focus",     phrases: ["search", "find", "look for", "search for"] },
    { action: "help",             phrases: ["help", "commands", "what can i say", "voice commands"] },
  ],
  hi: [
    { action: "nav:buy",          phrases: ["खरीदें", "होम", "मुख्य पृष्ठ", "उत्पाद दिखाएं", "ब्राउज़"] },
    { action: "nav:sell",         phrases: ["बेचें", "कारीगर", "लिस्टिंग बनाएं"] },
    { action: "nav:orders",       phrases: ["ऑर्डर", "मेरे ऑर्डर", "ऑर्डर देखें"] },
    { action: "nav:enquiry",      phrases: ["पूछताछ", "संदेश", "बातचीत"] },
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
    { action: "nav:buy",          phrases: ["வாங்கு", "முகப்பு", "தயாரிப்புகள்", "உலாவு"] },
    { action: "nav:sell",         phrases: ["விற்க", "கலைஞர்", "பட்டியல் உருவாக்கு"] },
    { action: "nav:orders",       phrases: ["ஆர்டர்", "என் ஆர்டர்கள்", "ஆர்டர் பார்க்க"] },
    { action: "nav:enquiry",      phrases: ["விசாரணை", "செய்திகள்", "உரையாடல்"] },
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
    { action: "nav:buy",          phrases: ["కొనండి", "హోమ్", "ఉత్పత్తులు చూపు", "బ్రౌజ్"] },
    { action: "nav:sell",         phrases: ["అమ్మండి", "కళాకారుడు", "జాబితా సృష్టించు"] },
    { action: "nav:orders",       phrases: ["ఆర్డర్లు", "నా ఆర్డర్లు", "ఆర్డర్ చూడండి"] },
    { action: "nav:enquiry",      phrases: ["విచారణలు", "సందేశాలు", "సంభాషణలు"] },
    { action: "nav:signin",       phrases: ["సైన్ ఇన్", "లాగిన్"] },
    { action: "nav:signup",       phrases: ["సైన్ అప్", "నమోదు", "చేరు"] },
    { action: "chat:open",        phrases: ["చాట్ తెరువు", "మార్గదర్శి తెరువు", "ధర అడుగు"] },
    { action: "chat:close",       phrases: ["చాట్ మూసివేయి", "మార్గదర్శి మూసివేయి"] },
    { action: "scroll:top",       phrases: ["పైకి వెళ్ళు", "పైన వెళ్ళు"] },
    { action: "scroll:catalogue", phrases: ["జాబితాకు వెళ్ళు", "ఉత్పత్తులు చూపు"] },
    { action: "search:focus",     phrases: ["వెతుకు", "శోధించు"] },
    { action: "help",             phrases: ["సహాయం", "ఆదేశాలు"] },
  ],
  kn: [
    { action: "nav:buy",          phrases: ["ಖರೀದಿಸಿ", "ಮನೆ", "ಉತ್ಪನ್ನಗಳು ತೋರಿಸು", "ಬ್ರೌಸ್"] },
    { action: "nav:sell",         phrases: ["ಮಾರಿ", "ಕಲಾವಿದ", "ಪಟ್ಟಿ ರಚಿಸು"] },
    { action: "nav:orders",       phrases: ["ಆರ್ಡರ್ಗಳು", "ನನ್ನ ಆರ್ಡರ್ಗಳು", "ಆರ್ಡರ್ ನೋಡಿ"] },
    { action: "nav:enquiry",      phrases: ["ವಿಚಾರಣೆ", "ಸಂದೇಶಗಳು", "ಸಂಭಾಷಣೆಗಳು"] },
    { action: "nav:signin",       phrases: ["ಸೈನ್ ಇನ್", "ಲಾಗಿನ್"] },
    { action: "nav:signup",       phrases: ["ಸೈನ್ ಅಪ್", "ನೋಂದಣಿ", "ಸೇರು"] },
    { action: "chat:open",        phrases: ["ಚಾಟ್ ತೆರೆ", "ಮಾರ್ಗದರ್ಶಿ ತೆರೆ", "ಬೆಲೆ ಕೇಳು"] },
    { action: "chat:close",       phrases: ["ಚಾಟ್ ಮುಚ್ಚು", "ಮಾರ್ಗದರ್ಶಿ ಮುಚ್ಚು"] },
    { action: "scroll:top",       phrases: ["ಮೇಲೆ ಹೋಗು", "ಮೇಲ್ಭಾಗಕ್ಕೆ ಹೋಗು"] },
    { action: "scroll:catalogue", phrases: ["ಪಟ್ಟಿಗೆ ಹೋಗು", "ಉತ್ಪನ್ನಗಳು ತೋರಿಸು"] },
    { action: "search:focus",     phrases: ["ಹುಡುಕು", "ಹುಡುಕಾಟ"] },
    { action: "help",             phrases: ["ಸಹಾಯ", "ಆದೇಶಗಳು"] },
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
