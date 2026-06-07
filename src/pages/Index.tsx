import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

type CartridgeType = {
  id: string;
  name: string;
  brand: string;
  price: number;
  color: string;
};

type DeliveryOption = {
  id: string;
  name: string;
  description: string;
  days: string;
  price: number;
  icon: string;
};

const CARTRIDGES: CartridgeType[] = [
  { id: "hp-black", name: "HP 85A / CE285A", brand: "HP", price: 890, color: "Чёрный" },
  { id: "hp-color", name: "HP 305A / CE411A", brand: "HP", price: 1290, color: "Голубой" },
  { id: "canon-black", name: "Canon 725 / 3484B002", brand: "Canon", price: 820, color: "Чёрный" },
  { id: "canon-color", name: "Canon 716 / 1977B002", brand: "Canon", price: 1350, color: "Пурпурный" },
  { id: "samsung-black", name: "Samsung MLT-D101S", brand: "Samsung", price: 750, color: "Чёрный" },
  { id: "xerox-black", name: "Xerox 106R02773", brand: "Xerox", price: 980, color: "Чёрный" },
  { id: "epson-black", name: "Epson T0731 / C13T07314A", brand: "Epson", price: 490, color: "Чёрный" },
  { id: "brother-black", name: "Brother TN-2090", brand: "Brother", price: 860, color: "Чёрный" },
];

const DELIVERY_OPTIONS: DeliveryOption[] = [
  {
    id: "express",
    name: "Экспресс",
    description: "Доставка курьером в день заказа (при заказе до 12:00)",
    days: "Сегодня",
    price: 350,
    icon: "Zap",
  },
  {
    id: "standard",
    name: "Стандарт",
    description: "Доставка курьером по городу на следующий рабочий день",
    days: "1 рабочий день",
    price: 150,
    icon: "Truck",
  },
  {
    id: "pickup",
    name: "Самовывоз",
    description: "Забрать из нашего офиса по адресу: ул. Ленина, 42, оф. 301",
    days: "Готово через 2 часа",
    price: 0,
    icon: "MapPin",
  },
  {
    id: "post",
    name: "Почта России / СДЭК",
    description: "Доставка в регионы транспортной компанией на ваш выбор",
    days: "3–7 рабочих дней",
    price: 250,
    icon: "Package",
  },
];

type FormData = {
  name: string;
  phone: string;
  email: string;
  cartridgeId: string;
  quantity: number;
  deliveryId: string;
  address: string;
  comment: string;
};

type Step = "order" | "delivery" | "confirm" | "success";

export default function Index() {
  const [step, setStep] = useState<Step>("order");
  const [pushGranted, setPushGranted] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [showDeliveryInfo, setShowDeliveryInfo] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [form, setForm] = useState<FormData>({
    name: "",
    phone: "",
    email: "",
    cartridgeId: "",
    quantity: 1,
    deliveryId: "standard",
    address: "",
    comment: "",
  });

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      setPushGranted(true);
    }
  }, []);

  const requestPush = async () => {
    if (typeof Notification === "undefined") return;
    setPushLoading(true);
    try {
      const result = await Notification.requestPermission();
      if (result === "granted") {
        setPushGranted(true);
        new Notification("КартриджСервис", {
          body: "Уведомления подключены. Вы будете получать статус заказа.",
          icon: "/favicon.svg",
        });
      }
    } finally {
      setPushLoading(false);
    }
  };

  const submitOrder = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const cartridge = CARTRIDGES.find((c) => c.id === form.cartridgeId);
      const delivery = DELIVERY_OPTIONS.find((d) => d.id === form.deliveryId);
      const total = (cartridge?.price ?? 0) * form.quantity + (delivery?.price ?? 0);
      const res = await fetch("https://functions.poehali.dev/1c73c8c1-f276-4ff7-83c5-b726da5e7c37", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email,
          cartridgeName: cartridge?.name ?? "",
          cartridgeBrand: cartridge?.brand ?? "",
          cartridgeColor: cartridge?.color ?? "",
          cartridgePrice: cartridge?.price ?? 0,
          quantity: form.quantity,
          deliveryName: delivery?.name ?? "",
          deliveryDays: delivery?.days ?? "",
          deliveryPrice: delivery?.price ?? 0,
          address: form.address,
          comment: form.comment,
          totalPrice: total,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error("Ошибка сервера");
      setOrderNumber(data.orderNumber ?? "");
      setStep("success");
    } catch {
      setSubmitError("Не удалось отправить заказ. Позвоните нам: +7 (495) 123-45-67");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCartridge = CARTRIDGES.find((c) => c.id === form.cartridgeId);
  const selectedDelivery = DELIVERY_OPTIONS.find((d) => d.id === form.deliveryId);
  const totalPrice =
    (selectedCartridge?.price ?? 0) * form.quantity + (selectedDelivery?.price ?? 0);

  const updateForm = (key: keyof FormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const canGoToDelivery =
    form.name.trim() && form.phone.trim() && form.cartridgeId && form.quantity > 0;
  const canConfirm =
    form.deliveryId &&
    (form.deliveryId === "pickup" || form.address.trim().length > 0);

  const steps: { key: Step; label: string }[] = [
    { key: "order", label: "Товар" },
    { key: "delivery", label: "Доставка" },
    { key: "confirm", label: "Подтверждение" },
  ];

  const stepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen" style={{ background: "var(--clr-navy)", fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40"
        style={{
          background: "rgba(10,15,30,0.94)",
          borderBottom: "1px solid var(--clr-line)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded flex items-center justify-center"
              style={{ background: "var(--clr-blue)" }}
            >
              <Icon name="Printer" size={15} style={{ color: "#0a0f1e" }} />
            </div>
            <span className="font-semibold text-sm tracking-wide" style={{ color: "var(--clr-text)" }}>
              КартриджСервис
            </span>
          </div>

          <div className="flex items-center gap-3">
            {!pushGranted ? (
              <button
                onClick={requestPush}
                disabled={pushLoading}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded transition-all"
                style={{
                  border: "1px solid var(--clr-steel)",
                  color: "var(--clr-text-dim)",
                  background: "transparent",
                }}
              >
                <Icon name="Bell" size={13} />
                {pushLoading ? "..." : "Уведомления"}
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--clr-success)" }}>
                <span className="status-dot pulse-dot" style={{ background: "var(--clr-success)" }} />
                Уведомления активны
              </div>
            )}
            <a
              href="tel:+74951234567"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded transition-all"
              style={{ background: "var(--clr-blue)", color: "#0a0f1e" }}
            >
              <Icon name="Phone" size={13} />
              Позвонить
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {step !== "success" && (
          <div className="flex items-center gap-0 mb-8 animate-fade-in">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold font-mono-num transition-all"
                    style={{
                      background: i <= stepIndex ? "var(--clr-blue)" : "var(--clr-steel)",
                      color: i <= stepIndex ? "#0a0f1e" : "var(--clr-muted)",
                    }}
                  >
                    {i < stepIndex ? <Icon name="Check" size={12} /> : i + 1}
                  </div>
                  <span
                    className="text-xs font-medium"
                    style={{ color: i <= stepIndex ? "var(--clr-text)" : "var(--clr-muted)" }}
                  >
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className="w-12 h-px mx-3"
                    style={{ background: i < stepIndex ? "var(--clr-blue)" : "var(--clr-line)" }}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* STEP 1: Товар и контакты */}
        {step === "order" && (
          <div className="animate-slide-up space-y-6">
            <div>
              <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--clr-text)" }}>
                Заказ картриджа
              </h1>
              <p className="text-sm" style={{ color: "var(--clr-text-dim)" }}>
                Выберите картридж и укажите контактные данные
              </p>
            </div>

            <div className="glass-card rounded-lg p-5 space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--clr-blue)" }}>
                Ваши данные
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--clr-text-dim)" }}>
                    Имя и фамилия *
                  </label>
                  <input
                    type="text"
                    placeholder="Иванов Иван"
                    value={form.name}
                    onChange={(e) => updateForm("name", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded transition-all"
                    style={{
                      background: "var(--clr-steel)",
                      border: "1px solid var(--clr-line)",
                      color: "var(--clr-text)",
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--clr-text-dim)" }}>
                    Телефон *
                  </label>
                  <input
                    type="tel"
                    placeholder="+7 (999) 000-00-00"
                    value={form.phone}
                    onChange={(e) => updateForm("phone", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded transition-all"
                    style={{
                      background: "var(--clr-steel)",
                      border: "1px solid var(--clr-line)",
                      color: "var(--clr-text)",
                    }}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--clr-text-dim)" }}>
                    Email (для квитанции)
                  </label>
                  <input
                    type="email"
                    placeholder="ivan@company.ru"
                    value={form.email}
                    onChange={(e) => updateForm("email", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded transition-all"
                    style={{
                      background: "var(--clr-steel)",
                      border: "1px solid var(--clr-line)",
                      color: "var(--clr-text)",
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="glass-card rounded-lg p-5 space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--clr-blue)" }}>
                Выберите картридж
              </h2>
              <div className="grid gap-2">
                {CARTRIDGES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => updateForm("cartridgeId", c.id)}
                    className="flex items-center justify-between w-full px-4 py-3 rounded text-left transition-all"
                    style={{
                      background: form.cartridgeId === c.id ? "rgba(43,127,255,0.12)" : "var(--clr-steel)",
                      border: form.cartridgeId === c.id ? "1px solid var(--clr-blue)" : "1px solid transparent",
                    }}
                  >
                    <div>
                      <div className="text-sm font-medium" style={{ color: "var(--clr-text)" }}>
                        {c.name}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--clr-text-dim)" }}>
                        {c.brand} · {c.color}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold font-mono-num" style={{ color: "var(--clr-blue)" }}>
                        {c.price.toLocaleString("ru-RU")} ₽
                      </span>
                      {form.cartridgeId === c.id && (
                        <Icon name="CheckCircle" size={16} style={{ color: "var(--clr-blue)" }} />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {form.cartridgeId && (
              <div className="glass-card rounded-lg p-5 animate-slide-up">
                <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--clr-blue)" }}>
                  Количество
                </h2>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateForm("quantity", Math.max(1, form.quantity - 1))}
                      className="w-9 h-9 rounded flex items-center justify-center transition-all"
                      style={{ background: "var(--clr-steel)", color: "var(--clr-text)" }}
                    >
                      <Icon name="Minus" size={16} />
                    </button>
                    <span className="text-xl font-semibold font-mono-num w-8 text-center" style={{ color: "var(--clr-text)" }}>
                      {form.quantity}
                    </span>
                    <button
                      onClick={() => updateForm("quantity", form.quantity + 1)}
                      className="w-9 h-9 rounded flex items-center justify-center transition-all"
                      style={{ background: "var(--clr-steel)", color: "var(--clr-text)" }}
                    >
                      <Icon name="Plus" size={16} />
                    </button>
                  </div>
                  <div className="text-sm" style={{ color: "var(--clr-text-dim)" }}>
                    × <span style={{ color: "var(--clr-text)" }}>{selectedCartridge?.price.toLocaleString("ru-RU")} ₽</span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => canGoToDelivery && setStep("delivery")}
              disabled={!canGoToDelivery}
              className="w-full py-3.5 rounded font-semibold text-sm transition-all"
              style={{
                background: canGoToDelivery ? "var(--clr-blue)" : "var(--clr-steel)",
                color: canGoToDelivery ? "#0a0f1e" : "var(--clr-muted)",
                cursor: canGoToDelivery ? "pointer" : "not-allowed",
              }}
            >
              Выбрать доставку →
            </button>
          </div>
        )}

        {/* STEP 2: Доставка */}
        {step === "delivery" && (
          <div className="animate-slide-up space-y-6">
            <div>
              <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--clr-text)" }}>
                Способ доставки
              </h1>
              <p className="text-sm" style={{ color: "var(--clr-text-dim)" }}>
                Выберите удобный способ и укажите адрес
              </p>
            </div>

            <div className="glass-card rounded-lg p-5 space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--clr-blue)" }}>
                Варианты доставки
              </h2>
              {DELIVERY_OPTIONS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => updateForm("deliveryId", d.id)}
                  className="flex items-start justify-between w-full px-4 py-3.5 rounded text-left transition-all"
                  style={{
                    background: form.deliveryId === d.id ? "rgba(43,127,255,0.12)" : "var(--clr-steel)",
                    border: form.deliveryId === d.id ? "1px solid var(--clr-blue)" : "1px solid transparent",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center mt-0.5 flex-shrink-0"
                      style={{
                        background: form.deliveryId === d.id ? "rgba(43,127,255,0.2)" : "rgba(255,255,255,0.05)",
                      }}
                    >
                      <Icon
                        name={d.icon}
                        size={16}
                        style={{ color: form.deliveryId === d.id ? "var(--clr-blue)" : "var(--clr-text-dim)" }}
                      />
                    </div>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: "var(--clr-text)" }}>
                        {d.name}
                      </div>
                      <div className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--clr-text-dim)" }}>
                        {d.description}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs" style={{ color: "var(--clr-success)" }}>
                        <Icon name="Clock" size={11} />
                        {d.days}
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-4">
                    <span
                      className="text-sm font-semibold font-mono-num"
                      style={{ color: d.price === 0 ? "var(--clr-success)" : "var(--clr-blue)" }}
                    >
                      {d.price === 0 ? "Бесплатно" : `${d.price} ₽`}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {form.deliveryId && form.deliveryId !== "pickup" && (
              <div className="glass-card rounded-lg p-5 animate-slide-up">
                <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--clr-blue)" }}>
                  Адрес доставки
                </h2>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Город, улица, дом, квартира / офис"
                    value={form.address}
                    onChange={(e) => updateForm("address", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded transition-all"
                    style={{
                      background: "var(--clr-steel)",
                      border: "1px solid var(--clr-line)",
                      color: "var(--clr-text)",
                    }}
                  />
                  <textarea
                    placeholder="Комментарий к заказу (необязательно)"
                    rows={3}
                    value={form.comment}
                    onChange={(e) => updateForm("comment", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded transition-all resize-none"
                    style={{
                      background: "var(--clr-steel)",
                      border: "1px solid var(--clr-line)",
                      color: "var(--clr-text)",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Инфо о доставке */}
            <div className="glass-card rounded-lg overflow-hidden">
              <button
                onClick={() => setShowDeliveryInfo(!showDeliveryInfo)}
                className="w-full flex items-center justify-between px-5 py-4 text-left transition-all"
                style={{ color: "var(--clr-text-dim)" }}
              >
                <div className="flex items-center gap-2 text-sm">
                  <Icon name="Info" size={15} style={{ color: "var(--clr-blue)" }} />
                  Подробнее о доставке и сроках
                </div>
                <Icon name={showDeliveryInfo ? "ChevronUp" : "ChevronDown"} size={16} />
              </button>
              {showDeliveryInfo && (
                <div
                  className="px-5 pb-5 text-xs leading-relaxed space-y-3 animate-fade-in"
                  style={{ color: "var(--clr-text-dim)", borderTop: "1px solid var(--clr-line)", paddingTop: "1rem" }}
                >
                  <p>
                    <strong style={{ color: "var(--clr-text)" }}>Экспресс-доставка</strong> — в день заказа при
                    оформлении до 12:00 по московскому времени. Курьер по Москве в пределах МКАД.
                  </p>
                  <p>
                    <strong style={{ color: "var(--clr-text)" }}>Стандартная доставка</strong> — курьером на следующий
                    рабочий день. Москва и Подмосковье в пределах 30 км от МКАД.
                  </p>
                  <p>
                    <strong style={{ color: "var(--clr-text)" }}>Самовывоз</strong> — через 2 часа после оформления.
                    Адрес: ул. Ленина, 42, оф. 301. Пн–Пт 09:00–18:00.
                  </p>
                  <p>
                    <strong style={{ color: "var(--clr-text)" }}>Доставка в регионы</strong> — Почтой России или СДЭК.
                    Сроки: 3–7 рабочих дней. Трек-номер отправляется на email.
                  </p>
                  <div
                    className="flex items-start gap-2 p-3 rounded mt-2"
                    style={{ background: "rgba(43,127,255,0.08)", border: "1px solid rgba(43,127,255,0.2)" }}
                  >
                    <Icon name="ShieldCheck" size={14} style={{ color: "var(--clr-blue)", marginTop: "1px" }} />
                    <span style={{ color: "var(--clr-text)" }}>
                      Все картриджи проходят проверку перед отправкой. Гарантия возврата 14 дней.
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep("order")}
                className="px-5 py-3.5 rounded font-medium text-sm transition-all"
                style={{ background: "var(--clr-steel)", color: "var(--clr-text)" }}
              >
                ← Назад
              </button>
              <button
                onClick={() => canConfirm && setStep("confirm")}
                disabled={!canConfirm}
                className="flex-1 py-3.5 rounded font-semibold text-sm transition-all"
                style={{
                  background: canConfirm ? "var(--clr-blue)" : "var(--clr-steel)",
                  color: canConfirm ? "#0a0f1e" : "var(--clr-muted)",
                  cursor: canConfirm ? "pointer" : "not-allowed",
                }}
              >
                Перейти к подтверждению →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Подтверждение */}
        {step === "confirm" && (
          <div className="animate-slide-up space-y-6">
            <div>
              <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--clr-text)" }}>
                Подтверждение
              </h1>
              <p className="text-sm" style={{ color: "var(--clr-text-dim)" }}>
                Проверьте данные перед оформлением
              </p>
            </div>

            <div className="glass-card rounded-lg p-5 space-y-4">
              <div>
                <div className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ color: "var(--clr-blue)" }}>
                  Заказ
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--clr-text)" }}>
                      {selectedCartridge?.name}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--clr-text-dim)" }}>
                      {selectedCartridge?.brand} · {selectedCartridge?.color} · {form.quantity} шт.
                    </div>
                  </div>
                  <span className="text-sm font-semibold font-mono-num" style={{ color: "var(--clr-text)" }}>
                    {((selectedCartridge?.price ?? 0) * form.quantity).toLocaleString("ru-RU")} ₽
                  </span>
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--clr-line)" }} />

              <div>
                <div className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ color: "var(--clr-blue)" }}>
                  Доставка
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--clr-text)" }}>
                      {selectedDelivery?.name}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--clr-text-dim)" }}>
                      {selectedDelivery?.days}
                    </div>
                    {form.address && (
                      <div className="text-xs mt-0.5" style={{ color: "var(--clr-text-dim)" }}>
                        {form.address}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-semibold font-mono-num" style={{ color: "var(--clr-text)" }}>
                    {selectedDelivery?.price === 0 ? "Бесплатно" : `${selectedDelivery?.price} ₽`}
                  </span>
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--clr-line)" }} />

              <div>
                <div className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ color: "var(--clr-blue)" }}>
                  Контакт
                </div>
                <div className="text-sm" style={{ color: "var(--clr-text)" }}>{form.name}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--clr-text-dim)" }}>
                  {form.phone} {form.email && `· ${form.email}`}
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--clr-line)" }} />

              <div className="flex justify-between items-center">
                <span className="font-semibold" style={{ color: "var(--clr-text)" }}>
                  Итого к оплате
                </span>
                <span className="text-2xl font-bold font-mono-num" style={{ color: "var(--clr-blue)" }}>
                  {totalPrice.toLocaleString("ru-RU")} ₽
                </span>
              </div>
            </div>

            {!pushGranted && (
              <div
                className="flex items-start gap-3 p-4 rounded-lg animate-fade-in"
                style={{ background: "rgba(43,127,255,0.08)", border: "1px solid rgba(43,127,255,0.2)" }}
              >
                <Icon name="Bell" size={16} style={{ color: "var(--clr-blue)", marginTop: "2px" }} />
                <div>
                  <div className="text-sm font-medium mb-0.5" style={{ color: "var(--clr-text)" }}>
                    Включите уведомления о статусе
                  </div>
                  <div className="text-xs mb-2" style={{ color: "var(--clr-text-dim)" }}>
                    Получайте push-уведомления о готовности и доставке заказа
                  </div>
                  <button
                    onClick={requestPush}
                    className="text-xs px-3 py-1.5 rounded font-semibold"
                    style={{ background: "var(--clr-blue)", color: "#0a0f1e" }}
                  >
                    Включить
                  </button>
                </div>
              </div>
            )}

            {submitError && (
              <div
                className="flex items-center gap-2 p-3 rounded text-sm animate-fade-in"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}
              >
                <Icon name="AlertCircle" size={15} />
                {submitError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep("delivery")}
                disabled={submitting}
                className="px-5 py-3.5 rounded font-medium text-sm transition-all"
                style={{ background: "var(--clr-steel)", color: "var(--clr-text)" }}
              >
                ← Назад
              </button>
              <button
                onClick={submitOrder}
                disabled={submitting}
                className="flex-1 py-3.5 rounded font-semibold text-sm transition-all flex items-center justify-center gap-2"
                style={{
                  background: submitting ? "var(--clr-steel)" : "var(--clr-blue)",
                  color: submitting ? "var(--clr-muted)" : "#0a0f1e",
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                {submitting ? (
                  <>
                    <Icon name="Loader" size={15} />
                    Отправляем...
                  </>
                ) : (
                  "Оформить заказ"
                )}
              </button>
            </div>
          </div>
        )}

        {/* SUCCESS */}
        {step === "success" && (
          <div className="animate-slide-up text-center py-12 px-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)" }}
            >
              <Icon name="CheckCircle" size={32} style={{ color: "var(--clr-success)" }} />
            </div>
            <h1 className="text-2xl font-bold mb-3" style={{ color: "var(--clr-text)" }}>
              Заказ оформлен!
            </h1>
            <p className="text-sm mb-2" style={{ color: "var(--clr-text-dim)" }}>
              Номер заказа:{" "}
              <span className="font-mono-num font-semibold" style={{ color: "var(--clr-blue)" }}>
                #{orderNumber}
              </span>
            </p>
            <p className="text-sm mb-8" style={{ color: "var(--clr-text-dim)" }}>
              Свяжемся с вами по номеру {form.phone} в течение 15 минут для подтверждения.
            </p>

            <div className="glass-card rounded-lg p-5 mb-8 text-left space-y-3">
              <div className="text-xs uppercase tracking-widest font-semibold mb-4" style={{ color: "var(--clr-blue)" }}>
                Статус заказа
              </div>
              {[
                { label: "Заказ принят", done: true },
                { label: "Комплектация", done: false },
                { label: "Передан в доставку", done: false },
                { label: "Доставлен", done: false },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: s.done ? "rgba(34,197,94,0.15)" : "var(--clr-steel)",
                      border: s.done ? "1px solid rgba(34,197,94,0.4)" : "1px solid var(--clr-line)",
                    }}
                  >
                    {s.done ? (
                      <Icon name="Check" size={11} style={{ color: "var(--clr-success)" }} />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--clr-muted)" }} />
                    )}
                  </div>
                  <span className="text-sm" style={{ color: s.done ? "var(--clr-text)" : "var(--clr-muted)" }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setStep("order");
                setOrderNumber("");
                setSubmitError("");
                setForm({
                  name: "", phone: "", email: "", cartridgeId: "", quantity: 1,
                  deliveryId: "standard", address: "", comment: "",
                });
              }}
              className="w-full py-3.5 rounded font-semibold text-sm"
              style={{ background: "var(--clr-steel)", color: "var(--clr-text)" }}
            >
              Оформить ещё один заказ
            </button>
          </div>
        )}
      </main>

      {step !== "success" && (
        <footer className="max-w-2xl mx-auto px-4 py-6 mt-4">
          <div
            className="flex flex-wrap items-center justify-between gap-3 text-xs"
            style={{ color: "var(--clr-muted)", borderTop: "1px solid var(--clr-line)", paddingTop: "1.5rem" }}
          >
            <div className="flex items-center gap-4">
              <span>© 2024 КартриджСервис</span>
              <span>ИНН 7700000000</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="tel:+74951234567" className="hover:text-white transition-colors">
                +7 (495) 123-45-67
              </a>
              <span>Пн–Пт 09:00–18:00</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}