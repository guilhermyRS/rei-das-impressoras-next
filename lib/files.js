import { supabase } from './supabase'

// Upload file
export async function uploadFile(file, userId) {
  try {
    const nome = `${Date.now()}_${file.name}`

    // Upload file to storage
    const { error: uploadError } = await supabase.storage.from('uploads').upload(nome, file)

    if (uploadError) throw uploadError

    // Save file reference in database
    const { data, error } = await supabase
      .from('arquivos')
      .insert({
        nome: file.name,
        path: nome,
        status: 'pendente',
        usuario_id: userId,
      })
      .select()
      .single()

    if (error) throw error

    return { data }
  } catch (error) {
    return { error }
  }
}

// Get user file history
export async function getUserFiles(userId) {
  try {
    const { data, error } = await supabase
      .from('arquivos')
      .select('*')
      .eq('usuario_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return { data }
  } catch (error) {
    return { error }
  }
}