import { createClient } from "@/libs/supabase/server";
import { isUserAdmin } from "@/libs/admin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const isAdmin = isUserAdmin({ email: user.email, id: user.id });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      isAdmin,
      adminStatus: isAdmin ? "🔧 Admin access enabled" : "Regular user",
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at
    });

  } catch (error) {
    console.error('User fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 }
    );
  }
} 