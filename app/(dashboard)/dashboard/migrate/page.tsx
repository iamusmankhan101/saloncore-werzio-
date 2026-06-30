"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Database, CheckCircle, XCircle, Loader2, ArrowRight } from "lucide-react";
import { migrateUserDataToDatabase, clearLocalStorageData } from "@/lib/migrate-to-db";

export default function MigratePage() {
  const router = useRouter();
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    migrated: string[];
    errors: string[];
  } | null>(null);

  async function handleMigrate() {
    setMigrating(true);
    setResult(null);

    try {
      const migrationResult = await migrateUserDataToDatabase();
      setResult(migrationResult);

      if (migrationResult.success) {
        // Clear localStorage after successful migration
        setTimeout(() => {
          clearLocalStorageData();
          alert("Migration complete! Your data is now stored in the database.");
          router.push("/dashboard");
        }, 2000);
      }
    } catch (err) {
      setResult({
        success: false,
        migrated: [],
        errors: [err instanceof Error ? err.message : "Migration failed"],
      });
    } finally {
      setMigrating(false);
    }
  }

  return (
    <div className="dashboard-polish" style={{ minHeight: "100vh", background: "#f4f5f7", padding: "40px 32px", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ maxWidth: 600, width: "100%", background: "#fff", borderRadius: 20, padding: "40px", boxShadow: "0 8px 40px rgba(0,0,0,0.08)" }}>
        
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg,#7C3AED,#9333EA)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <Database size={36} color="#fff" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#1a1a2e", marginBottom: 8 }}>
            Migrate to Database Storage
          </h1>
          <p style={{ fontSize: 14, color: "#6b6b8a", lineHeight: 1.6 }}>
            Move your data from browser storage to our secure cloud database for better reliability and cross-device access.
          </p>
        </div>

        {/* Benefits */}
        <div style={{ background: "#f5f3ff", borderRadius: 12, padding: "20px", marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#7C3AED", marginBottom: 12 }}>Benefits:</div>
          {[
            "Access your data from any device",
            "Never lose data due to browser issues",
            "Faster performance and better reliability",
            "Automatic backups and data security",
          ].map((benefit) => (
            <div key={benefit} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <CheckCircle size={14} color="#7C3AED" />
              <span style={{ fontSize: 13, color: "#4a4a6a" }}>{benefit}</span>
            </div>
          ))}
        </div>

        {/* Migration Status */}
        {result && (
          <div style={{ 
            background: result.success ? "#ecfdf5" : "#fef2f2", 
            border: `1px solid ${result.success ? "#a7f3d0" : "#fecaca"}`,
            borderRadius: 12, 
            padding: "16px 20px", 
            marginBottom: 24 
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              {result.success ? (
                <CheckCircle size={20} color="#059669" />
              ) : (
                <XCircle size={20} color="#dc2626" />
              )}
              <div style={{ fontSize: 14, fontWeight: 700, color: result.success ? "#065f46" : "#991b1b" }}>
                {result.success ? "Migration Successful!" : "Migration Failed"}
              </div>
            </div>

            {result.migrated.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#065f46", marginBottom: 6 }}>Migrated:</div>
                {result.migrated.map((item) => (
                  <div key={item} style={{ fontSize: 12, color: "#047857", marginLeft: 16 }}>
                    ✓ {item}
                  </div>
                ))}
              </div>
            )}

            {result.errors.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#991b1b", marginBottom: 6 }}>Errors:</div>
                {result.errors.map((error, i) => (
                  <div key={i} style={{ fontSize: 12, color: "#dc2626", marginLeft: 16 }}>
                    ✗ {error}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              flex: 1,
              padding: "14px 0",
              borderRadius: 12,
              border: "1px solid #e8e8f0",
              background: "#fff",
              fontSize: 14,
              fontWeight: 600,
              color: "#6b6b8a",
              cursor: "pointer",
            }}
          >
            Skip for Now
          </button>
          <button
            onClick={handleMigrate}
            disabled={migrating || (result?.success ?? false)}
            style={{
              flex: 2,
              padding: "14px 0",
              borderRadius: 12,
              border: "none",
              background: migrating || result?.success 
                ? "#e8e8f0" 
                : "linear-gradient(135deg,#7C3AED,#9333EA)",
              fontSize: 14,
              fontWeight: 700,
              color: migrating || result?.success ? "#aaaabc" : "#fff",
              cursor: migrating || result?.success ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {migrating ? (
              <>
                <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                Migrating...
              </>
            ) : result?.success ? (
              <>
                <CheckCircle size={16} />
                Migration Complete
              </>
            ) : (
              <>
                <ArrowRight size={16} />
                Start Migration
              </>
            )}
          </button>
        </div>

        {/* Warning */}
        <div style={{ marginTop: 20, padding: "12px 16px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: "#92400e", lineHeight: 1.6 }}>
            <strong>Note:</strong> This process is safe and won't delete your existing data until migration is confirmed successful.
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
