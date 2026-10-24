/* Requests board settings. Fill these in after setting up Supabase (see supabase/board.sql and the README).
   The anon key is meant to be public: what visitors can do is limited by the row-level security rules in board.sql. */
window.MN_BOARD = {
  url: 'https://ufrtjugjbpywjylhmvxi.supabase.co',        // e.g. 'https://ufrtjugjbpywjylhmvxi.supabase.co'
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmcnRqdWdqYnB5d2p5bGhtdnhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3OTk4MjUsImV4cCI6MjEwODM3NTgyNX0.yoEYdO0Tgi9S_JbvyVVg-NuiZ_O0cOFcC4OxwEzNOD4',    // Project Settings → API → anon public key
  ownerName: 'JH'   // shown on your replies and status changes
};
