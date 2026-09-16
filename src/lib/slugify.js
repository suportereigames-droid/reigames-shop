// Transforma um texto (nome de categoria, título de produto, etc.) num
// "slug" pra usar na URL: minúsculo, sem acento, sem caractere que não seja
// letra/número (troca por traço), sem traço sobrando no início/fim.
// Precisa ser IDÊNTICA à versão usada no server.js — senão o servidor não
// acha o produto certo a partir do link.
export function slugify(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
