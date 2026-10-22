@AGENTS.md

## Solo para Claude Code

- Responde siempre en español.
- Antes de modificar código, explica la justificación y el plan, y espera aprobación.
- Trabaja por fases; al terminar cada una verifica (`npx tsc --noEmit`, tests de los módulos tocados, lint sin errores nuevos) y, si cambia la API, una prueba real contra la base.
- No hagas commits: los hace el usuario.
