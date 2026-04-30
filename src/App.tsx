import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

type ServicePackage = {
  id: string;
  name: string;
  outcome: string;
  promptTemplate: string;
  price: number;
};

type OrderStatus = "awaiting_review" | "processing" | "completed";

type Order = {
  id: string;
  customerName: string;
  customerEmail: string;
  senderPhone: string;
  packageId: string;
  packageName: string;
  addons: string[];
  notes: string;
  amount: number;
  paymentNumber: string;
  paymentProofUrl: string;
  status: OrderStatus;
  serviceResult?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
};

const servicePackages: ServicePackage[] = [
  {
    id: "starter",
    name: "باقة Starter",
    outcome: "صفحة هبوط + 5 منشورات تسويقية + سكربت مبيعات",
    promptTemplate:
      "أنشئ صفحة هبوط عربية مختصرة + 5 منشورات تسويقية + سكربت مبيعات لخدمة رقمية. اجعل الأسلوب واضحا وعمليا.",
    price: 120,
  },
  {
    id: "growth",
    name: "باقة Growth",
    outcome: "صفحة هبوط + 15 منشور + 3 حملات بريد",
    promptTemplate:
      "أنشئ خطة نمو كاملة تتضمن صفحة هبوط عربية + 15 منشور + 3 حملات بريد مبيعات مع CTA واضح.",
    price: 260,
  },
  {
    id: "pro",
    name: "باقة Pro",
    outcome: "نظام محتوى شهري + خطة تحويلات",
    promptTemplate:
      "أنشئ نظام محتوى شهري كامل لخدمة رقمية مع خطة تحويلات وتحسين عروض البيع باللغة العربية.",
    price: 490,
  },
];

const addons = [
  { id: "express", label: "تسليم سريع", price: 60 },
  { id: "ads", label: "إعداد إعلان ممول", price: 75 },
  { id: "seo", label: "تحسين SEO", price: 40 },
];

const storageKey = "money-machine-orders-v3";
const vodafoneCashNumber = "01034147127";

function makeOrderId() {
  return `ORD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleString("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildServicePrompt(order: Order) {
  const addonText = order.addons.length > 0 ? order.addons.join(" | ") : "لا يوجد";
  return [
    "نفذ خدمة عميل عربية باحتراف.",
    `الباقة: ${order.packageName}`,
    `الإضافات: ${addonText}`,
    `تفاصيل العميل: ${order.notes || "لا توجد تفاصيل"}`,
    "أعد النتيجة بشكل واضح مع عناوين قصيرة ونقاط قابلة للتنفيذ.",
  ].join("\n");
}

export default function App() {
  const [selectedId, setSelectedId] = useState(servicePackages[0].id);
  const [coupon, setCoupon] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [paymentProofUrl, setPaymentProofUrl] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);

  const [adminSecret, setAdminSecret] = useState("");
  const [lookupOrderId, setLookupOrderId] = useState("");
  const [lookupEmail, setLookupEmail] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      setOrders(JSON.parse(raw) as Order[]);
    } catch {
      setOrders([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(orders));
  }, [orders]);

  const selectedPackage = useMemo(
    () => servicePackages.find((item) => item.id === selectedId) ?? servicePackages[0],
    [selectedId],
  );

  const subtotal = useMemo(() => {
    const addonsTotal = addons
      .filter((addon) => selectedAddons.includes(addon.id))
      .reduce((sum, addon) => sum + addon.price, 0);
    return selectedPackage.price + addonsTotal;
  }, [selectedAddons, selectedPackage.price]);

  const finalPrice = useMemo(() => {
    const hasCoupon = coupon.trim().toLowerCase() === "start20";
    return hasCoupon ? Math.round(subtotal * 0.8) : subtotal;
  }, [coupon, subtotal]);

  const metrics = useMemo(() => {
    const awaitingReview = orders.filter((order) => order.status === "awaiting_review").length;
    const processing = orders.filter((order) => order.status === "processing").length;
    const completed = orders.filter((order) => order.status === "completed").length;
    const revenue = orders
      .filter((order) => order.status === "completed")
      .reduce((sum, order) => sum + order.amount, 0);

    return { totalOrders: orders.length, awaitingReview, processing, completed, revenue };
  }, [orders]);

  const foundOrder = useMemo(() => {
    if (!lookupOrderId.trim() || !lookupEmail.trim()) return undefined;
    return orders.find(
      (order) =>
        order.id.toLowerCase() === lookupOrderId.trim().toLowerCase() &&
        order.customerEmail.toLowerCase() === lookupEmail.trim().toLowerCase(),
    );
  }, [lookupEmail, lookupOrderId, orders]);

  const toggleAddon = (addonId: string) => {
    setSelectedAddons((prev) =>
      prev.includes(addonId) ? prev.filter((item) => item !== addonId) : [...prev, addonId],
    );
  };

  const handleProofUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setPaymentProofUrl(String(reader.result));
    reader.readAsDataURL(file);
  };

  const createOrder = (event: FormEvent) => {
    event.preventDefault();
    if (!customerName.trim() || !customerEmail.trim() || !senderPhone.trim() || !paymentProofUrl) return;

    const order: Order = {
      id: makeOrderId(),
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      senderPhone: senderPhone.trim(),
      packageId: selectedPackage.id,
      packageName: selectedPackage.name,
      addons: addons.filter((addon) => selectedAddons.includes(addon.id)).map((addon) => addon.label),
      notes: notes.trim(),
      amount: finalPrice,
      paymentNumber: vodafoneCashNumber,
      paymentProofUrl,
      status: "awaiting_review",
      createdAt: new Date().toISOString(),
    };

    setOrders((prev) => [order, ...prev]);
    setCustomerName("");
    setCustomerEmail("");
    setSenderPhone("");
    setNotes("");
    setSelectedAddons([]);
    setCoupon("");
    setPaymentProofUrl("");
  };

  const runOpenAIForOrder = async (orderId: string) => {
    const secret = adminSecret.trim();
    if (!secret) {
      alert("ادخل Admin Secret أولاً.");
      return;
    }

    const order = orders.find((item) => item.id === orderId);
    if (!order) return;

    const packageTemplate =
      servicePackages.find((item) => item.id === order.packageId)?.promptTemplate ||
      "أنشئ خدمة تسويقية عربية احترافية.";
    const prompt = `${packageTemplate}\n\n${buildServicePrompt(order)}`;

    setOrders((prev) =>
      prev.map((item) => (item.id === orderId ? { ...item, status: "processing", errorMessage: undefined } : item)),
    );

    try {
      const response = await fetch("/api/execute-service", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret,
        },
        body: JSON.stringify({
          orderId: order.id,
          packageName: order.packageName,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          notes: order.notes,
          addons: order.addons,
          amount: order.amount,
          prompt,
        }),
      });

      if (!response.ok) {
        const apiError = await response.text();
        throw new Error(apiError || `Server error: ${response.status}`);
      }

      const data = await response.json();
      const outputText =
        data.output_text ||
        data.output?.[0]?.content?.[0]?.text ||
        "تم تنفيذ الخدمة بنجاح.";

      setOrders((prev) =>
        prev.map((item) =>
          item.id === orderId
            ? {
                ...item,
                status: "completed",
                serviceResult: outputText,
                completedAt: new Date().toISOString(),
                errorMessage: undefined,
              }
            : item,
        ),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "حدث خطأ غير متوقع";
      setOrders((prev) =>
        prev.map((item) =>
          item.id === orderId
            ? {
                ...item,
                status: "awaiting_review",
                errorMessage: message,
              }
            : item,
        ),
      );
    }
  };

  const resetAll = () => {
    setOrders([]);
    localStorage.removeItem(storageKey);
  };

  return (
    <div dir="rtl" className="bg-zinc-950 text-zinc-100">
      <header className="relative isolate min-h-screen overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=2200&q=80"
          alt="لوحة إدارة طلبات خدمات رقمية"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-zinc-950/70" />

        <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-14 lg:px-10">
          <p className="fade-up text-2xl font-black tracking-[0.16em] text-emerald-300">MONEY MACHINE</p>
          <h1 className="fade-up mt-5 max-w-3xl text-4xl leading-tight font-bold text-white md:text-6xl">
            فودافون كاش + إثبات تحويل + تنفيذ الخدمة تلقائيا عبر AI
          </h1>
          <p className="fade-up mt-6 max-w-2xl text-lg text-zinc-200 md:text-xl">
            العميل يختار الخدمة ويرفع صورة التحويل، وأنت تؤكد الدفع من لوحة Admin ثم الموقع ينفذ
            الخدمة ويعرض النتيجة للعميل.
          </p>
          <div className="fade-up mt-9 flex flex-wrap gap-4">
            <a
              href="#order"
              className="rounded-md bg-emerald-400 px-6 py-3 font-semibold text-zinc-950 transition hover:bg-emerald-300"
            >
              شراء الآن
            </a>
          </div>
        </div>
      </header>

      <main>
        <section id="order" className="mx-auto max-w-6xl px-6 py-16 lg:px-10">
          <h2 className="text-3xl font-bold text-white md:text-4xl">شراء الخدمة</h2>
          <p className="mt-3 max-w-2xl text-zinc-300">
            اختر الباقة، حول على رقم فودافون كاش، ثم ارفع صورة التحويل وأدخل رقم المحول منه.
          </p>

          <form
            onSubmit={createOrder}
            className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 backdrop-blur md:p-8"
          >
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-6">
                <label className="block space-y-2">
                  <span className="text-sm text-zinc-300">اختر باقة الخدمة</span>
                  <select
                    value={selectedId}
                    onChange={(event) => setSelectedId(event.target.value)}
                    className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none ring-emerald-300 focus:ring"
                  >
                    {servicePackages.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>

                <fieldset className="space-y-2">
                  <legend className="text-sm text-zinc-300">إضافات اختيارية</legend>
                  <div className="space-y-2">
                    {addons.map((addon) => (
                      <label
                        key={addon.id}
                        className="flex items-center justify-between rounded-md border border-zinc-800 px-4 py-3"
                      >
                        <span>{addon.label}</span>
                        <span className="text-emerald-300">+${addon.price}</span>
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-emerald-400"
                          checked={selectedAddons.includes(addon.id)}
                          onChange={() => toggleAddon(addon.id)}
                        />
                      </label>
                    ))}
                  </div>
                </fieldset>

                <label className="block space-y-2">
                  <span className="text-sm text-zinc-300">كوبون (اختياري): START20</span>
                  <input
                    value={coupon}
                    onChange={(event) => setCoupon(event.target.value)}
                    className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none ring-emerald-300 focus:ring"
                  />
                </label>
              </div>

              <div className="space-y-6">
                <label className="block space-y-2">
                  <span className="text-sm text-zinc-300">اسم العميل</span>
                  <input
                    required
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none ring-emerald-300 focus:ring"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm text-zinc-300">إيميل العميل</span>
                  <input
                    required
                    type="email"
                    value={customerEmail}
                    onChange={(event) => setCustomerEmail(event.target.value)}
                    className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none ring-emerald-300 focus:ring"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm text-zinc-300">رقم الموبايل الذي تم التحويل منه</span>
                  <input
                    required
                    value={senderPhone}
                    onChange={(event) => setSenderPhone(event.target.value)}
                    placeholder="مثال: 010xxxxxxxx"
                    className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none ring-emerald-300 placeholder:text-zinc-500 focus:ring"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm text-zinc-300">تفاصيل الطلب</span>
                  <textarea
                    rows={4}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none ring-emerald-300 focus:ring"
                  />
                </label>
              </div>
            </div>

            <div className="mt-8 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5">
              <p className="text-sm text-emerald-200">رقم فودافون كاش للتحويل</p>
              <p className="mt-2 text-3xl font-black text-white">{vodafoneCashNumber}</p>

              <label className="mt-4 block space-y-2">
                <span className="text-sm text-zinc-300">ارفع صورة التحويل</span>
                <input
                  required
                  type="file"
                  accept="image/*"
                  onChange={handleProofUpload}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-emerald-400 file:px-3 file:py-2 file:font-semibold file:text-zinc-950"
                />
              </label>

              {paymentProofUrl && (
                <img
                  src={paymentProofUrl}
                  alt="إثبات التحويل"
                  className="slide-in mt-4 h-40 w-full rounded-lg object-cover md:w-80"
                />
              )}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-800 pt-6">
              <div>
                <p className="text-sm text-zinc-300">{selectedPackage.name}</p>
                <p className="text-zinc-400">{selectedPackage.outcome}</p>
              </div>
              <p className="text-4xl font-black text-white">${finalPrice}</p>
              <button
                type="submit"
                disabled={!paymentProofUrl}
                className="rounded-md bg-emerald-400 px-6 py-3 font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                إرسال الطلب
              </button>
            </div>
          </form>
        </section>

        <section id="track" className="mx-auto max-w-6xl px-6 py-16 lg:px-10">
          <h2 className="text-3xl font-bold text-white md:text-4xl">متابعة نتيجة العميل</h2>
          <p className="mt-3 max-w-2xl text-zinc-300">ادخل رقم الطلب والإيميل لعرض الحالة والنتيجة.</p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <input
              value={lookupOrderId}
              onChange={(event) => setLookupOrderId(event.target.value)}
              placeholder="رقم الطلب"
              className="rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none ring-emerald-300 focus:ring"
            />
            <input
              value={lookupEmail}
              onChange={(event) => setLookupEmail(event.target.value)}
              placeholder="البريد الإلكتروني"
              className="rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none ring-emerald-300 focus:ring"
            />
          </div>

          {foundOrder && (
            <div className="slide-in mt-6 rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
              <p className="text-zinc-300">الحالة: {foundOrder.status}</p>
              <p className="text-zinc-300">القيمة: ${foundOrder.amount}</p>
              {foundOrder.status === "completed" && foundOrder.serviceResult && (
                <pre className="mt-4 whitespace-pre-wrap rounded-md border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-200">
                  {foundOrder.serviceResult}
                </pre>
              )}
            </div>
          )}
        </section>

        <section id="admin" className="mx-auto max-w-6xl px-6 py-16 lg:px-10">
          <h2 className="text-3xl font-bold text-white md:text-4xl">Admin</h2>
          <p className="mt-3 max-w-2xl text-zinc-300">
            الطلبات الجديدة تظهر هنا مع إثبات التحويل. بعد المراجعة اضغط "تأكيد الدفع وتنفيذ الخدمة".
          </p>

          <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
            <label className="block space-y-2">
              <span className="text-sm text-zinc-300">Admin Secret (لا يظهر للعميل)</span>
              <input
                type="password"
                value={adminSecret}
                onChange={(event) => setAdminSecret(event.target.value)}
                placeholder="أدخل كلمة سر الإدارة"
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none ring-emerald-300 placeholder:text-zinc-500 focus:ring"
              />
            </label>
            <p className="mt-2 text-xs text-zinc-400">
              المفتاح الحقيقي لـ OpenAI محفوظ في السيرفر عبر متغير البيئة OPENAI_API_KEY.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-5">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
              <p className="text-sm text-zinc-400">إجمالي الطلبات</p>
              <p className="mt-2 text-3xl font-bold">{metrics.totalOrders}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
              <p className="text-sm text-zinc-400">قيد المراجعة</p>
              <p className="mt-2 text-3xl font-bold">{metrics.awaitingReview}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
              <p className="text-sm text-zinc-400">قيد التنفيذ</p>
              <p className="mt-2 text-3xl font-bold">{metrics.processing}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
              <p className="text-sm text-zinc-400">مكتمل</p>
              <p className="mt-2 text-3xl font-bold">{metrics.completed}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
              <p className="text-sm text-zinc-400">الإيراد</p>
              <p className="mt-2 text-3xl font-bold">${metrics.revenue}</p>
            </div>
          </div>

          <div className="mt-10 space-y-4">
            {orders.length === 0 && <p className="text-zinc-400">لا توجد طلبات حتى الآن.</p>}

            {orders.map((order) => (
              <div key={order.id} className="slide-in rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-bold text-white">{order.id}</p>
                    <p className="text-zinc-300">{order.packageName}</p>
                    <p className="text-zinc-400">{order.customerName}</p>
                    <p className="text-zinc-400">{order.customerEmail}</p>
                    <p className="text-zinc-400">رقم التحويل من: {order.senderPhone}</p>
                    <p className="text-zinc-400">تاريخ الإنشاء: {formatDate(order.createdAt)}</p>
                    {order.completedAt && <p className="text-zinc-400">الاكتمال: {formatDate(order.completedAt)}</p>}
                  </div>
                  <div className="text-left">
                    <p className="text-3xl font-black text-white">${order.amount}</p>
                    <p className="text-zinc-400">الحالة: {order.status}</p>
                  </div>
                </div>

                <p className="mt-3 text-zinc-300">الإضافات: {order.addons.length > 0 ? order.addons.join(" | ") : "لا يوجد"}</p>
                <p className="text-zinc-300">ملاحظات: {order.notes || "لا توجد"}</p>

                <img
                  src={order.paymentProofUrl}
                  alt={`إثبات تحويل ${order.id}`}
                  className="mt-4 h-44 w-full rounded-lg object-cover md:w-96"
                />

                {order.errorMessage && <p className="mt-3 text-red-300">خطأ التنفيذ: {order.errorMessage}</p>}

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => runOpenAIForOrder(order.id)}
                    disabled={order.status !== "awaiting_review"}
                    className="rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    تأكيد الدفع وتنفيذ الخدمة
                  </button>
                  <a
                    href={`mailto:${order.customerEmail}?subject=${encodeURIComponent(`تحديث طلب ${order.id}`)}&body=${encodeURIComponent(
                      `مرحباً ${order.customerName}\n\nحالة طلبك الحالية: ${order.status}.`,
                    )}`}
                    className="rounded-md border border-emerald-300/50 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-300/10"
                  >
                    مراسلة العميل
                  </a>
                </div>

                {order.status === "completed" && order.serviceResult && (
                  <pre className="mt-4 whitespace-pre-wrap rounded-md border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-200">
                    {order.serviceResult}
                  </pre>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8">
            <button
              type="button"
              onClick={resetAll}
              className="rounded-md border border-red-300/50 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-300/10"
            >
              مسح كل الطلبات
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
