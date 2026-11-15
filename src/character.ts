/** Original vector artwork. No remote assets or sprite decoding required. */
export function character(): string {
  return `<svg class="moss" viewBox="0 0 240 240" aria-hidden="true">
    <defs>
      <radialGradient id="body" cx="35%" cy="25%" r="80%"><stop stop-color="#e2ebcb"/><stop offset="1" stop-color="#aec795"/></radialGradient>
      <linearGradient id="leaf" x2="1" y2="1"><stop stop-color="#7c9d67"/><stop offset="1" stop-color="#3e684d"/></linearGradient>
    </defs>
    <ellipse class="shadow" cx="120" cy="218" rx="60" ry="9" fill="#203e26" opacity=".12"/>
    <g class="creature">
      <g class="feet" fill="#8eaa7b"><ellipse class="foot left" cx="88" cy="207" rx="23" ry="12"/><ellipse class="foot right" cx="151" cy="207" rx="23" ry="12"/></g>
      <path class="arm left" d="M58 139Q28 145 42 169Q51 177 65 161" fill="#b5cb9c"/>
      <path class="arm right" d="M182 139Q212 145 198 169Q189 177 175 161" fill="#b5cb9c"/>
      <path d="M120 61C73 61 51 97 53 145C55 194 78 211 120 211C162 211 185 194 187 145C189 97 167 61 120 61Z" fill="url(#body)" stroke="#9db98b" stroke-width="1.5"/>
      <g class="tuft"><path d="M120 67Q110 38 101 31" fill="none" stroke="#628557" stroke-width="5" stroke-linecap="round"/><path d="M116 56Q107 14 154 22Q160 53 116 56" fill="url(#leaf)"/><path d="M118 52L142 31" fill="none" stroke="#a5bf82" stroke-width="2" stroke-linecap="round"/></g>
      <ellipse cx="78" cy="155" rx="14" ry="8" fill="#d5a49a" opacity=".5"/><ellipse cx="162" cy="155" rx="14" ry="8" fill="#d5a49a" opacity=".5"/>
      <g class="eyes"><ellipse cx="94" cy="137" rx="6" ry="8" fill="#293f33"/><ellipse cx="146" cy="137" rx="6" ry="8" fill="#293f33"/><circle cx="96" cy="134" r="2" fill="#fff"/><circle cx="148" cy="134" r="2" fill="#fff"/></g>
      <g class="sleep-eyes" fill="none" stroke="#293f33" stroke-width="3" stroke-linecap="round"><path d="M86 139Q94 145 102 139"/><path d="M138 139Q146 145 154 139"/></g>
      <path class="mouth" d="M113 158Q120 165 127 158" fill="none" stroke="#425a40" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="95" cy="90" rx="13" ry="6" fill="#fff" opacity=".18" transform="rotate(-30 95 90)"/>
    </g>
    <g class="hearts" fill="#b47b6a"><path d="M184 78C172 66 158 83 184 99C210 83 196 66 184 78"/><path d="M51 99C43 91 33 102 51 113C69 102 59 91 51 99"/></g>
    <g class="zzz" fill="#64805b" font-family="serif" font-size="22"><text x="172" y="83">z</text><text x="193" y="62" font-size="16">z</text></g>
  </svg>`;
}
