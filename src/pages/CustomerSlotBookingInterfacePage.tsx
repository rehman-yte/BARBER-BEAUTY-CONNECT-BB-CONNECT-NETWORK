import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs, Firestore } from 'firebase/firestore';

interface CustomerSlotBookingInterfacePageProps {
  currentPartnerIdParam?: string;
  dbReference?: Firestore | any;
  loggedInCustomerContext?: any;
}

const CustomerSlotBookingInterfacePage: React.FC<CustomerSlotBookingInterfacePageProps> = ({ 
  currentPartnerIdParam, 
  dbReference, 
  loggedInCustomerContext 
}) => {
  const [targetPartnerProfile, setTargetPartnerProfile] = useState<any>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<any[]>([]);
  const [systemUIRuntimeLoading, setSystemUIRuntimeLoading] = useState(true);
  const [dataCorruptionError, setDataCorruptionError] = useState(false);

  useEffect(() => {
    const fallbackAndFetchPartnerDataMatrix = async () => {
      // 1. Structural Safeguard: If the selected partner identification index is missing, trigger safe recovery mode instead of throwing a blank screen error.
      if (!currentPartnerIdParam) {
        console.error("Critical State Error: Selected partner dynamic identifier parameter is undefined.");
        setDataCorruptionError(true);
        setSystemUIRuntimeLoading(false);
        return;
      }

      if (!dbReference) {
        console.error("Critical State Error: Database reference (dbReference) is undefined or null.");
        setDataCorruptionError(true);
        setSystemUIRuntimeLoading(false);
        return;
      }

      try {
        setSystemUIRuntimeLoading(true);
        setDataCorruptionError(false);

        // 2. Fetch specific partner documentation using explicit document parsing constraints
        const targetedDocumentRef = doc(dbReference, "partners", String(currentPartnerIdParam));
        const documentSnapshotInstance = await getDoc(targetedDocumentRef);

        if (!documentSnapshotInstance.exists()) {
          console.warn(`Data Mismatch: No partner database record discovered matching reference index: ${currentPartnerIdParam}`);
          setDataCorruptionError(true);
          setSystemUIRuntimeLoading(false);
          return;
        }

        const rawPartnerPayload = documentSnapshotInstance.data();
        if (!rawPartnerPayload) {
          console.warn(`Data Mismatch: Partner document exists but contains no data payload.`);
          setDataCorruptionError(true);
          setSystemUIRuntimeLoading(false);
          return;
        }
        
        // Guard against internal key corruption from onboarding system modifications
        setTargetPartnerProfile({
          uid: documentSnapshotInstance.id,
          brandName: rawPartnerPayload.brandName || rawPartnerPayload.brand_name || "Premium Network Partner",
          ownerName: rawPartnerPayload.ownerName || rawPartnerPayload.owner_name || "Independent Professional",
          servicesAndPrices: (rawPartnerPayload.servicesAndPrices && typeof rawPartnerPayload.servicesAndPrices === 'object') ? rawPartnerPayload.servicesAndPrices : {},
          shopImages: Array.isArray(rawPartnerPayload.shopImages) ? rawPartnerPayload.shopImages : []
        });

        // 3. Dynamic Slots Extraction: Query configuration logs mapping to this specific partner node with robust try-catch block to prevent dynamic route collection query crashes.
        let loadedSlotsArray: any[] = [];
        try {
          const operationalSlotsQuery = query(
            collection(dbReference, "partner_slots_configuration"),
            where("partnerId", "==", String(currentPartnerIdParam))
          );
          
          const runtimeSlotsSnapshot = await getDocs(operationalSlotsQuery);
          if (runtimeSlotsSnapshot && !runtimeSlotsSnapshot.empty) {
            loadedSlotsArray = runtimeSlotsSnapshot.docs.map(slotDoc => ({
              id: slotDoc.id,
              ...slotDoc.data()
            }));
          }
        } catch (collectionError) {
          console.error("Non-blocking collection query exception caught inside dynamic route collection block:", collectionError);
        }

        if (loadedSlotsArray.length > 0) {
          setAvailableTimeSlots(loadedSlotsArray);
        } else {
          // Fallback Default Times Matrix to prevent view from collapsing empty
          setAvailableTimeSlots([
            { id: "default_1", timeString: "10:00 AM - 11:00 AM", available: true },
            { id: "default_2", timeString: "11:30 AM - 12:30 PM", available: true },
            { id: "default_3", timeString: "02:00 PM - 03:00 PM", available: true },
            { id: "default_4", timeString: "04:30 PM - 05:30 PM", available: true }
          ]);
        }

        setSystemUIRuntimeLoading(false);
      } catch (runtimeFaultException) {
        console.error("Critical Exception caught while mounting slot booking system views:", runtimeFaultException);
        setDataCorruptionError(true);
        setSystemUIRuntimeLoading(false);
      }
    };

    fallbackAndFetchPartnerDataMatrix();
  }, [currentPartnerIdParam, dbReference]);

  // Operational Render Controllers preventing application whitescreen behaviors
  if (systemUIRuntimeLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', fontFamily: 'sans-serif' }}>
        <p style={{ fontWeight: '600', color: '#475569' }}>Synchronizing premium network allocation matrix... Please wait.</p>
      </div>
    );
  }

  if (dataCorruptionError || !targetPartnerProfile) {
    return (
      <div style={{ padding: '40px 20px', maxWidth: '600px', margin: '0 auto', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h3 style={{ color: '#0f172a', fontWeight: '700' }}>⚠️ Secure Connection Interrupted</h3>
        <p style={{ color: '#64748b', marginTop: '10px' }}>
          The selected professional profile data profile is undergoing real-time sync or contains incomplete information. Please return to the explore view and choose another profile.
        </p>
      </div>
    );
  }

  return (
    <div className="dynamic-booking-wrapper" style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Target Shop Title Metadata Header Section */}
      <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '20px', marginBottom: '25px' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#0f172a' }}>{targetPartnerProfile.brandName}</h2>
        <p style={{ color: '#64748b', margin: '5px 0 0 0' }}>Managed Expert Professional: {targetPartnerProfile.ownerName}</p>
      </div>

      {/* Dynamic Content Columns: Services Inventory & Live Booking Appointment Slots Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        
        {/* Left Hand Allocation: Services Provided Listing */}
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '15px', color: '#1e293b' }}>Select Available Services</h3>
          {Object.keys(targetPartnerProfile.servicesAndPrices).length === 0 ? (
            <p style={{ fontStyle: 'italic', color: '#94a3b8' }}>Standard treatments listing available directly upon dynamic confirmation check.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.entries(targetPartnerProfile.servicesAndPrices).map(([serviceName, serviceCost]: [string, any]) => (
                <div key={serviceName} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  <span style={{ fontWeight: '600', color: '#334155' }}>{serviceName}</span>
                  <span style={{ fontWeight: '700', color: '#0284c7' }}>Rs.{serviceCost}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Hand Allocation: Time Configuration Slots Selector */}
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '15px', color: '#1e293b' }}>Select Appointment Slot</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {availableTimeSlots.map((slotItem) => (
              <button
                key={slotItem.id}
                disabled={!slotItem.available}
                style={{
                  padding: '14px',
                  borderRadius: '8px',
                  border: slotItem.available ? '1px solid #cbd5e1' : '1px solid #e2e8f0',
                  background: slotItem.available ? '#fff' : '#f1f5f9',
                  color: slotItem.available ? '#0f172a' : '#94a3b8',
                  fontWeight: '600',
                  cursor: slotItem.available ? 'pointer' : 'not-allowed',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                {slotItem.timeString}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default CustomerSlotBookingInterfacePage;
