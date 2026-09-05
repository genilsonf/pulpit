/* global Dexie */
export const db = new Dexie("SermoesDB");

db.version(7).stores({
  sermoes: "id, titulo, passagem, dataPregacao, horarioPregacao, local, ocasio, atualizadoEm",
  estudos: "id, texto, genero, tema, atualizadoEm",
  devocionais: "id, texto, data, atualizadoEm"
});