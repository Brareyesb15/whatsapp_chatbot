function generarNombresAleatorios(cantidad) {
  const nombresIniciales = [
    "Cyber",
    "Alpha",
    "Omega",
    "Quantum",
    "Neo",
    "Eclipse",
    "Nova",
    "Zenith",
    "Galaxy",
    "Shadow",
  ];
  const sufijos = [
    "One",
    "Prime",
    "X",
    "Master",
    "Pro",
    "Ultra",
    "Max",
    "Agent",
    "AI",
    "Bot",
  ];

  let nombresAleatorios = [];

  for (let i = 0; i < cantidad; i++) {
    const nombre =
      nombresIniciales[Math.floor(Math.random() * nombresIniciales.length)];
    const sufijo = sufijos[Math.floor(Math.random() * sufijos.length)];
    nombresAleatorios.push(`${nombre}${sufijo}`);
  }

  return nombresAleatorios;
}

module.exports = {
  generarNombresAleatorios,
};
