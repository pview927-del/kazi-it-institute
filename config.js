// Supabase settings: create a project at https://supabase.com, then paste Project URL and anon/public key.
// Never put a service_role key here. This file is public.
window.KAZI_CONFIG = {
  SUPABASE_URL: "https://mppbzyijfvgfmmlslphv.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_aE3_KOYrmjfrDCzBjPIrjg_iqVPnrB5",
  VAPID_PUBLIC_KEY: "", // Add the generated public VAPID key here after configuring Supabase Push.
  WHATSAPP_NUMBER: "8801701090350",
  OWNER_FACEBOOK: "https://www.facebook.com/share/1Fi4nW5eRy/?mibextid=wwXIfr",
  INSTITUTE_FACEBOOK: "https://www.facebook.com/share/1FeEdoq6AP/?mibextid=wwXIfr",
  BRANCHES: [
    { name: "ফুলারপার শাখা", address: "ফুলারপার (সঠিক উপজেলা/জেলা ও ঠিকানা যোগ করুন)", mapQuery: "Fularpar, Bangladesh" },
    { name: "বাথানডাঙ্গা শাখা", address: "বাথানডাঙ্গা (সঠিক উপজেলা/জেলা যোগ করুন)", mapQuery: "Bathandanga, Bangladesh" }
  ]
};