export function detectContactIntent(text) {
  return /contact|connect|reach|talk|speak|call|email|get in touch|join/i.test(
    text
  );
}

export function extractContactDetails(text) {
  const nameMatch = text.match(/([A-Za-z]+\s[A-Za-z]+)|([A-Za-z]+)/);
  const phoneMatch = text.match(/(?:\+?\d{1,3})?\d{7,12}/);
  const emailMatch = text.match(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
  );

  return {
    name: nameMatch?.[0] || "",
    phone: phoneMatch?.[0] || "",
    email: emailMatch?.[0] || "",
  };
}
