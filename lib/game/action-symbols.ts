// Reuses the shapes and colors of the existing inventory item art.
const wrap=(body:string)=>'<svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><g stroke="#253540" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">'+body+'</g></svg>';
export const ACTION_SYMBOLS={
 fertilizer:wrap('<path d="M24 12h16v17l10 12v11H14V41l10-12z" fill="#b0d2d9"/><path d="M20 38h24l4 6v7H16v-7z" fill="#62d6ab"/><path d="M23 10h18v8H23z" fill="#a17551"/><path d="M29 26v12m-7 8h9" stroke="#e8fff0"/>'),
 soil:wrap('<path d="M18 18h29l6 35H10z" fill="#9b684f"/><path d="M18 18l5-9 20 2 4 7z" fill="#d6b783"/><path d="M17 31h30v18H17z" fill="#edd4a0"/><path d="M24 42l7-10 8 10z" fill="#776247"/>'),
 meal:wrap('<path d="M10 32h44c-1 14-8 22-22 22S12 45 10 32z" fill="#e6bd89"/><ellipse cx="32" cy="32" rx="22" ry="8" fill="#ffc969"/><path d="M22 22c-6-6 5-7 0-14m10 14c-6-6 5-7 0-14m10 14c-6-6 5-7 0-14" stroke="#fff0c8"/><path d="M16 39c8 6 23 6 32 0" stroke="#fff1cb"/>'),
 unlock:wrap('<path d="M32 5l7 18 20 9-20 8-7 19-8-19-19-8 19-9z" fill="#d2b3ff"/><path d="M22 33l7 7 14-17" stroke="#fff8d7" stroke-width="5"/>')
};

