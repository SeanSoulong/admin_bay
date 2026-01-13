"use client";

import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { rtdb } from "../../src/lib/firebase";

export default function TestPage() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const itemsRef = ref(rtdb, "users");

    onValue(itemsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data).map(([key, value]: any) => ({
          id: key,
          ...value,
        }));
        setItems(list);
      }
    });
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Realtime DB Test</h1>

      {items.map((item) => (
        <div key={item.id} className="border p-3 mb-3 rounded">
          <h2 className="font-semibold">{item.name}</h2>
          <p>Price: {item.first_name}</p>
          <p>Category: {item.category}</p>
          <p>Rating: {item.rating}</p>
        </div>
      ))}
    </div>
  );
}
