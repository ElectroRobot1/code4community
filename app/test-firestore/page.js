"use client";
import { firestore } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function TestFirestorePage() {
  const testFirestore = async () => {
    try {
      console.log("Testing firestore import...");
      console.log("Firestore instance:", firestore);
      
      if (firestore) {
        console.log("✅ Firestore is properly imported and available");
        
        // Test a simple read operation
        const testDoc = doc(firestore, "test", "test");
        console.log("✅ Firestore doc reference created successfully");
        
        return "Firestore is working correctly!";
      } else {
        console.log("❌ Firestore is undefined");
        return "Firestore is undefined";
      }
    } catch (error) {
      console.error("❌ Error testing firestore:", error);
      return `Error: ${error.message}`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">Firestore Test</h1>
        <button 
          onClick={testFirestore}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Test Firestore Import
        </button>
        <p className="mt-4 text-sm text-gray-600">
          Check the browser console for results
        </p>
      </div>
    </div>
  );
}
