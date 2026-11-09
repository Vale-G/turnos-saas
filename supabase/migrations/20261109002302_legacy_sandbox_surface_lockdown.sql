-- Lock down objects inherited from the original Tunero sandbox. The current
-- Turnly application uses the singular tables and does not call this helper.
-- Keep the objects for compatibility, but remove their unnecessary public API
-- surface without deleting data.

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

revoke select on table
  public.negocios,
  public.turnos,
  public.perfiles,
  public.lista_negra
from anon;
