import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FurnitureDesign {
  furniture_type: string
  dimensions: {
    width: number
    height: number
    depth: number
  }
  materials: Array<{ type: string }>
  joinery?: Array<{ type: string }>
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { design, userId } = await req.json()
    
    if (!design || !design.furniture_type || !design.dimensions) {
      throw new Error('Invalid design data')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Generate 3D model based on furniture type
    const modelData = await generate3DModel(design)

    // Store model data in Supabase Storage
    const fileName = `models/${userId}/${Date.now()}_${design.furniture_type}.json`
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('3d-models')
      .upload(fileName, JSON.stringify(modelData), {
        contentType: 'application/json',
        upsert: true
      })

    if (uploadError) {
      throw uploadError
    }

    // Get public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('3d-models')
      .getPublicUrl(fileName)

    return new Response(
      JSON.stringify({
        success: true,
        modelUrl: publicUrl,
        modelData: modelData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

async function generate3DModel(design: FurnitureDesign) {
  const { furniture_type, dimensions, materials } = design
  
  // Generate basic 3D model data based on furniture type
  // This is a simplified version - in production, you'd use a proper 3D generation library
  
  switch (furniture_type) {
    case 'table':
      return generateTableModel(dimensions, materials)
    case 'bookshelf':
      return generateBookshelfModel(dimensions, materials)
    case 'chair':
      return generateChairModel(dimensions, materials)
    case 'desk':
      return generateDeskModel(dimensions, materials)
    default:
      return generateGenericBoxModel(dimensions, materials)
  }
}

function generateTableModel(dimensions: any, materials: any) {
  const { width, height, depth } = dimensions
  const topThickness = 1.5
  const legThickness = 3.5
  
  return {
    type: 'table',
    components: [
      // Tabletop
      {
        name: 'tabletop',
        type: 'box',
        position: [0, height - topThickness/2, 0],
        dimensions: [width, topThickness, depth],
        material: materials[0]?.type || 'wood'
      },
      // Legs
      {
        name: 'leg_fl',
        type: 'box',
        position: [-(width/2 - legThickness/2), height/2, -(depth/2 - legThickness/2)],
        dimensions: [legThickness, height - topThickness, legThickness],
        material: materials[0]?.type || 'wood'
      },
      {
        name: 'leg_fr',
        type: 'box',
        position: [(width/2 - legThickness/2), height/2, -(depth/2 - legThickness/2)],
        dimensions: [legThickness, height - topThickness, legThickness],
        material: materials[0]?.type || 'wood'
      },
      {
        name: 'leg_bl',
        type: 'box',
        position: [-(width/2 - legThickness/2), height/2, (depth/2 - legThickness/2)],
        dimensions: [legThickness, height - topThickness, legThickness],
        material: materials[0]?.type || 'wood'
      },
      {
        name: 'leg_br',
        type: 'box',
        position: [(width/2 - legThickness/2), height/2, (depth/2 - legThickness/2)],
        dimensions: [legThickness, height - topThickness, legThickness],
        material: materials[0]?.type || 'wood'
      }
    ]
  }
}

function generateBookshelfModel(dimensions: any, materials: any) {
  const { width, height, depth } = dimensions
  const thickness = 0.75
  const numShelves = Math.floor(height / 16) // One shelf every 16 inches
  
  const components = [
    // Sides
    {
      name: 'left_side',
      type: 'box',
      position: [-(width/2 - thickness/2), height/2, 0],
      dimensions: [thickness, height, depth],
      material: materials[0]?.type || 'wood'
    },
    {
      name: 'right_side',
      type: 'box',
      position: [(width/2 - thickness/2), height/2, 0],
      dimensions: [thickness, height, depth],
      material: materials[0]?.type || 'wood'
    }
  ]
  
  // Add shelves
  for (let i = 0; i <= numShelves; i++) {
    const shelfY = i * (height / numShelves)
    components.push({
      name: `shelf_${i}`,
      type: 'box',
      position: [0, shelfY + thickness/2, 0],
      dimensions: [width - 2*thickness, thickness, depth],
      material: materials[0]?.type || 'wood'
    })
  }
  
  return {
    type: 'bookshelf',
    components
  }
}

function generateChairModel(dimensions: any, materials: any) {
  const { width, height, depth } = dimensions
  const seatHeight = 18
  const legThickness = 2
  
  return {
    type: 'chair',
    components: [
      // Seat
      {
        name: 'seat',
        type: 'box',
        position: [0, seatHeight, 0],
        dimensions: [width, 2, depth],
        material: materials[0]?.type || 'wood'
      },
      // Back
      {
        name: 'back',
        type: 'box',
        position: [0, (height + seatHeight) / 2, -depth/2 + 1],
        dimensions: [width, height - seatHeight, 2],
        material: materials[0]?.type || 'wood'
      },
      // Legs
      {
        name: 'leg_fl',
        type: 'box',
        position: [-(width/2 - legThickness/2), seatHeight/2, -(depth/2 - legThickness/2)],
        dimensions: [legThickness, seatHeight, legThickness],
        material: materials[0]?.type || 'wood'
      },
      {
        name: 'leg_fr',
        type: 'box',
        position: [(width/2 - legThickness/2), seatHeight/2, -(depth/2 - legThickness/2)],
        dimensions: [legThickness, seatHeight, legThickness],
        material: materials[0]?.type || 'wood'
      },
      {
        name: 'leg_bl',
        type: 'box',
        position: [-(width/2 - legThickness/2), seatHeight/2, (depth/2 - legThickness/2)],
        dimensions: [legThickness, seatHeight, legThickness],
        material: materials[0]?.type || 'wood'
      },
      {
        name: 'leg_br',
        type: 'box',
        position: [(width/2 - legThickness/2), seatHeight/2, (depth/2 - legThickness/2)],
        dimensions: [legThickness, seatHeight, legThickness],
        material: materials[0]?.type || 'wood'
      }
    ]
  }
}

function generateDeskModel(dimensions: any, materials: any) {
  // Similar to table but with potential drawer components
  const tableModel = generateTableModel(dimensions, materials)
  tableModel.type = 'desk'
  
  // Add a simple drawer box
  const drawerHeight = 4
  const drawerWidth = Math.min(24, dimensions.width * 0.6)
  const drawerDepth = dimensions.depth * 0.8
  
  tableModel.components.push({
    name: 'drawer_box',
    type: 'box',
    position: [0, dimensions.height - drawerHeight - 2, 0],
    dimensions: [drawerWidth, drawerHeight, drawerDepth],
    material: materials[0]?.type || 'wood'
  })
  
  return tableModel
}

function generateGenericBoxModel(dimensions: any, materials: any) {
  const { width, height, depth } = dimensions
  
  return {
    type: 'generic',
    components: [
      {
        name: 'main_body',
        type: 'box',
        position: [0, height/2, 0],
        dimensions: [width, height, depth],
        material: materials[0]?.type || 'wood'
      }
    ]
  }
}
