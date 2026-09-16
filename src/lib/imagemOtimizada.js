// TEMPORARIAMENTE DESATIVADO: o recurso "Image Transformations" do Supabase
// (ainda em beta) está entregando fotos cortadas em alguns casos. Enquanto
// isso não é investigado com calma, essa função só devolve a URL original,
// sem nenhuma transformação — prioriza estabilidade do site.
export function imagemOtimizada(url) {
  return url
}
