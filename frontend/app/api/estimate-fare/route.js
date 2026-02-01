import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI("AIzaSyAilZuzLypD_j0cBIHlZyinSpS85gCa-bk");

export async function POST(req) {
    try {
        const body = await req.json();
        const { startAddress, endAddress, distanceKm, vehicleType = "auto" } = body;
        const dist = parseFloat(distanceKm || 0);

        // Vehicle-based pricing (INR per km)
        const vehiclePricing = {
            auto: { base: 30, perKm: 15, name: "Auto" },
            sedan: { base: 50, perKm: 20, name: "Sedan" },
            suv: { base: 80, perKm: 30, name: "SUV" },
            luxury: { base: 200, perKm: 100, name: "Luxury" }
        };

        const pricing = vehiclePricing[vehicleType.toLowerCase()] || vehiclePricing.auto;

        // Calculate INR Fare
        const estimatedINR = Math.round(pricing.base + (dist * pricing.perKm));

        // Exchange Rate Estimation (1 POL ≈ ₹42 INR)
        const exchangeRate = 42;
        const pricePOL = (estimatedINR / exchangeRate).toFixed(4);

        // Try AI for enhanced estimation
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
      Calculate ${pricing.name} taxi fare for ${dist} km ride from "${startAddress}" to "${endAddress}" in India.
      Base Rate: ₹${pricing.base}.
      Per Km Rate: ₹${pricing.perKm}.
      
      Output strictly valid JSON:
      {
        "priceINR": ${estimatedINR},
        "pricePOL": ${pricePOL},
        "exchangeRate": ${exchangeRate},
        "reasoning": "${pricing.name}: ₹${pricing.base} Base + ₹${pricing.perKm}/km",
        "vehicleType": "${pricing.name}"
      }
    `;

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
            const data = JSON.parse(cleanedText);
            return NextResponse.json(data);
        } catch (aiError) {
            console.warn("AI Pricing failed, using math fallback:", aiError.message);
            return NextResponse.json({
                priceINR: estimatedINR,
                pricePOL: pricePOL,
                exchangeRate: exchangeRate,
                reasoning: `${pricing.name}: ₹${pricing.base} Base + ₹${pricing.perKm}/km × ${dist}km`,
                vehicleType: pricing.name
            });
        }

    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: "Pricing failed" }, { status: 500 });
    }
}
