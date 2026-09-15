type LogoId = "paypal" | "orange_money" | "mtn_money" | "wero" | "virement";

export function LogoPaiement({ id, className = "" }: { id: LogoId; className?: string }) {
  return (
    <span className={`pay-logo pay-logo-${id.replace("_", "-")} ${className}`} aria-hidden>
      {id === "paypal" ? <LogoPaypal /> : null}
      {id === "orange_money" ? <LogoOrangeMoney /> : null}
      {id === "mtn_money" ? <LogoMtn /> : null}
      {id === "wero" ? <LogoWero /> : null}
      {id === "virement" ? <LogoVirement /> : null}
    </span>
  );
}

function LogoPaypal() {
  return (
    <svg viewBox="0 0 48 32" role="img">
      <title>PayPal</title>
      <rect width="48" height="32" rx="6" fill="#003087" />
      <path
        fill="#009CDE"
        d="M18.2 8.2h7.1c3.7 0 5.6 1.8 5.2 5.1-.5 4.1-3.1 6.4-7.1 6.4h-2.2l-.8 5.1h-3.4l3.2-16.6z"
      />
      <path
        fill="#fff"
        d="M14.4 8.2h7.2c2.2 0 3.9.5 4.7 1.9.6 1 .6 2.3.2 3.9-.7 3.3-3 5.1-6.4 5.1h-2.6L16.6 25h-3.5l1.3-16.8z"
        opacity=".95"
      />
    </svg>
  );
}

function LogoOrangeMoney() {
  return (
    <svg viewBox="0 0 48 32" role="img">
      <title>Orange Money</title>
      <rect width="48" height="32" rx="6" fill="#FF7900" />
      <circle cx="16.5" cy="16" r="6.2" fill="#fff" />
      <text x="26" y="20.2" fill="#fff" fontSize="9" fontWeight="700" fontFamily="Arial, sans-serif">
        OM
      </text>
    </svg>
  );
}

function LogoMtn() {
  return (
    <svg viewBox="0 0 48 32" role="img">
      <title>MTN Money</title>
      <rect width="48" height="32" rx="6" fill="#FFCC00" />
      <text
        x="24"
        y="20.5"
        textAnchor="middle"
        fill="#1A1A1A"
        fontSize="11"
        fontWeight="800"
        fontFamily="Arial, sans-serif"
      >
        MTN
      </text>
    </svg>
  );
}

function LogoWero() {
  return (
    <svg viewBox="0 0 48 32" role="img">
      <title>Wero</title>
      <rect width="48" height="32" rx="6" fill="#0B1F3A" />
      <path fill="#3DDC97" d="M10 22.5 16.2 9.5h4.1L14.2 22.5H10z" />
      <path fill="#fff" d="M18.6 22.5 24.8 9.5h4L22.6 22.5h-4z" />
      <path fill="#3DDC97" d="M27.4 22.5 33.6 9.5h4.1L31.5 22.5h-4.1z" />
    </svg>
  );
}

function LogoVirement() {
  return (
    <svg viewBox="0 0 48 32" role="img">
      <title>Virement bancaire</title>
      <rect width="48" height="32" rx="6" fill="#0A2C5C" />
      <path
        fill="#fff"
        d="M10 13.2h28v1.6H10zm0 4h28v1.6H10zm3-8.4h22L24 6.2 13 8.8zm1.4 14.6h19.2v1.8H14.4z"
      />
      <path fill="#7EB0E8" d="M15.2 20.2h2.2v3.2h-2.2zm7.7 0h2.2v3.2h-2.2zm7.7 0h2.2v3.2h-2.2z" />
    </svg>
  );
}
