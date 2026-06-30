import React from "react";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { SalonInvoice } from "@/lib/salon-invoices";

const styles = StyleSheet.create({
  page: { padding: 38, fontFamily: "Helvetica", fontSize: 9, color: "#1a1a2e" },
  header: { backgroundColor: "#5B21B6", borderRadius: 10, padding: 22, marginBottom: 24 },
  salon: { color: "#ffffff", fontSize: 21, fontFamily: "Helvetica-Bold" },
  subtitle: { color: "#ddd6fe", marginTop: 5, fontSize: 9 },
  metaGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 22 },
  metaCol: { width: "47%" },
  label: { color: "#9898b0", fontSize: 8, textTransform: "uppercase", marginBottom: 5 },
  value: { fontFamily: "Helvetica-Bold", fontSize: 11, marginBottom: 4 },
  muted: { color: "#6b6b8a", lineHeight: 1.5 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f4f1fb", borderTopLeftRadius: 7, borderTopRightRadius: 7, padding: 9 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#eeeeF4", padding: 9 },
  description: { width: "46%" },
  qty: { width: "10%", textAlign: "right" },
  amount: { width: "22%", textAlign: "right" },
  head: { fontFamily: "Helvetica-Bold", color: "#5B21B6", fontSize: 8 },
  summary: { marginLeft: "auto", width: "48%", marginTop: 18 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  total: { backgroundColor: "#5B21B6", color: "#ffffff", borderRadius: 7, padding: 10, marginTop: 6, flexDirection: "row", justifyContent: "space-between", fontFamily: "Helvetica-Bold", fontSize: 12 },
  status: { marginTop: 20, alignSelf: "flex-end", paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, fontFamily: "Helvetica-Bold" },
  footer: { position: "absolute", bottom: 28, left: 38, right: 38, borderTopWidth: 1, borderTopColor: "#eceaf2", paddingTop: 10, textAlign: "center", color: "#9898b0", fontSize: 8 },
});

function money(value: number) {
  return `PKR ${Math.round(value).toLocaleString("en-PK")}`;
}

function InvoiceDocument({ invoice, salon }: {
  invoice: SalonInvoice;
  salon: { name: string; phone?: string; email?: string; address?: string };
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.salon}>{salon.name || "Salon Central"}</Text>
          <Text style={styles.subtitle}>Thank you for choosing us</Text>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaCol}>
            <Text style={styles.label}>Bill To</Text>
            <Text style={styles.value}>{invoice.clientName}</Text>
            {!!invoice.clientPhone && <Text style={styles.muted}>{invoice.clientPhone}</Text>}
            {!!invoice.clientEmail && <Text style={styles.muted}>{invoice.clientEmail}</Text>}
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.label}>Invoice Details</Text>
            <Text style={styles.value}>{invoice.number}</Text>
            <Text style={styles.muted}>Date: {invoice.date}</Text>
            {!!invoice.staffName && <Text style={styles.muted}>Staff: {invoice.staffName}</Text>}
            <Text style={styles.muted}>Payment: {invoice.paymentMethod || "Pay later"}</Text>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.description, styles.head]}>Description</Text>
          <Text style={[styles.qty, styles.head]}>Qty</Text>
          <Text style={[styles.amount, styles.head]}>Unit Price</Text>
          <Text style={[styles.amount, styles.head]}>Amount</Text>
        </View>
        {invoice.items.map((item) => (
          <View key={item.id} style={styles.row}>
            <Text style={styles.description}>{item.description}</Text>
            <Text style={styles.qty}>{item.qty}</Text>
            <Text style={styles.amount}>{money(item.unitPrice)}</Text>
            <Text style={styles.amount}>{money(item.total)}</Text>
          </View>
        ))}

        <View style={styles.summary}>
          <View style={styles.summaryRow}><Text>Subtotal</Text><Text>{money(invoice.subtotal)}</Text></View>
          {invoice.discountAmount > 0 && (
            <View style={styles.summaryRow}><Text>Discount</Text><Text>- {money(invoice.discountAmount)}</Text></View>
          )}
          {invoice.taxAmount > 0 && (
            <View style={styles.summaryRow}><Text>Tax</Text><Text>{money(invoice.taxAmount)}</Text></View>
          )}
          <View style={styles.total}><Text>Total</Text><Text>{money(invoice.total)}</Text></View>
        </View>

        <Text style={[
          styles.status,
          invoice.status === "paid"
            ? { backgroundColor: "#dcfce7", color: "#047857" }
            : { backgroundColor: "#fef3c7", color: "#b45309" },
        ]}>
          {invoice.status === "paid" ? "PAID" : "PAYMENT DUE"}
        </Text>

        {!!invoice.notes && <Text style={[styles.muted, { marginTop: 16 }]}>Note: {invoice.notes}</Text>}
        <Text style={styles.footer}>
          {[salon.address, salon.phone, salon.email].filter(Boolean).join("  •  ")}
        </Text>
      </Page>
    </Document>
  );
}

export async function generateSalonInvoicePdf(
  invoice: SalonInvoice,
  salon: { name: string; phone?: string; email?: string; address?: string },
) {
  return renderToBuffer(<InvoiceDocument invoice={invoice} salon={salon} />);
}
