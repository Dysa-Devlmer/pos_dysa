import { Stack } from "expo-router";

/**
 * Stack navigator del tab "Ventas" — M6.
 *
 * Estructura:
 *   - index: listado paginado de ventas con filtros básicos
 *   - [id]: detalle de boleta (items, cliente, totales)
 *   - [id]/devolucion: formulario de creación de devolución parcial/total
 *
 * headerShown=false acá + SafeAreaView en cada child: cada pantalla
 * renderiza su propio header para mantener consistencia con las otras
 * tabs que ya siguen ese patrón.
 */
export default function VentasLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
