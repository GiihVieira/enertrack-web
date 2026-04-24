import { redirect } from 'next/navigation'

// O middleware já protege /dashboard — aqui só garante que / redireciona
export default function RootPage() {
  redirect('/dashboard')
}
