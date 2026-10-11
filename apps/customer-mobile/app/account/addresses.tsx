import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddressLocationPicker } from '../../components/address-location-picker';
import { FormField } from '../../components/form-field';
import { RequireCustomer } from '../../components/require-customer';
import { StackHeader } from '../../components/stack-header';
import { ErrorBlock, LoadingBlock, MustardButton, SecondaryButton } from '../../components/ui';
import { fetchCustomerProfile } from '../../lib/account';
import {
  addressFormToWriteBody,
  addressLine,
  addressToForm,
  emptyAddressForm,
  type AddressForm,
} from '../../lib/address-map';
import type { AddressMapPoint } from '../../lib/address-map-html';
import { isPointOutsideProvince } from '../../lib/address-point';
import {
  listAddressDistricts,
  listAddressNeighborhoods,
  listAddressProvinces,
  createCustomerAddress,
  deleteCustomerAddress,
  listCustomerAddresses,
  updateCustomerAddress,
} from '../../lib/addresses';
import { formatApiError } from '../../lib/api';
import { checkDeliveryServiceability } from '../../lib/checkout';
import { deviceLocationMessage, getDeviceLocation } from '../../lib/device-location';
import type { CustomerAddress } from '../../lib/schemas';
import { colors, fonts, minTouch, radius, space } from '../../theme';

type ServiceNote = { tone: 'delivery' | 'outside' | 'unknown'; label: string };

const notePill: Record<ServiceNote['tone'], { background: string; color: string }> = {
  delivery: { background: 'rgba(254,179,0,0.15)', color: colors.mustardGlow },
  outside: { background: 'rgba(255,180,171,0.14)', color: colors.error },
  unknown: { background: colors.surfaceHigh, color: colors.ash },
};

export default function AccountAddressesRoute() {
  return (
    <View style={styles.root}>
      <StackHeader title="Adreslerim" />
      <RequireCustomer next="/account/addresses">
        <AddressesBody />
      </RequireCustomer>
    </View>
  );
}

function AddressesBody() {
  const insets = useSafeAreaInsets();
  const [list, setList] = useState<CustomerAddress[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, ServiceNote>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<AddressForm>(emptyAddressForm);
  const [saving, setSaving] = useState(false);
  const [serviceNote, setServiceNote] = useState<string | null>(null);
  const [devicePoint, setDevicePoint] = useState<AddressMapPoint | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [provinces, setProvinces] = useState<
    Array<{ id: number; name: string; centerLatitude?: number; centerLongitude?: number }>
  >([]);
  const [districts, setDistricts] = useState<Array<{ id: number; name: string }>>([]);
  const [neighborhoods, setNeighborhoods] = useState<Array<{ id: number; name: string }>>([]);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [neighborhoodsLoading, setNeighborhoodsLoading] = useState(false);
  const [activePicker, setActivePicker] = useState<'province' | 'district' | 'neighborhood' | null>(
    null,
  );
  const [optionSearch, setOptionSearch] = useState('');

  const filteredOptions = useMemo(() => {
    const options =
      activePicker === 'province'
        ? provinces
        : activePicker === 'district'
          ? districts
          : neighborhoods;
    const query = optionSearch.trim().toLocaleLowerCase('tr-TR');
    return query && activePicker !== 'neighborhood'
      ? options.filter((item) => item.name.toLocaleLowerCase('tr-TR').includes(query))
      : options;
  }, [activePicker, districts, neighborhoods, optionSearch, provinces]);
  const selectedProvince = provinces.find((item) => item.id === Number(form.provinceId));

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const rows = await listCustomerAddresses();
      setList(rows);
      setSelectedId(
        (current) => current ?? rows.find((row) => row.isDefault)?.id ?? rows[0]?.id ?? null,
      );
      const next: Record<string, ServiceNote> = {};
      await Promise.all(
        rows.map(async (row) => {
          try {
            const loc = await checkDeliveryServiceability(
              row.latitude,
              row.longitude,
              row.label ?? row.street ?? 'Adres',
            );
            next[row.id] = loc.serviceable
              ? { tone: 'delivery', label: 'Teslimat var' }
              : { tone: 'outside', label: 'Bölge dışı' };
          } catch {
            next[row.id] = { tone: 'unknown', label: 'Kontrol edilemedi' };
          }
        }),
      );
      setNotes(next);
      setStatus('ready');
      setError(null);
    } catch (err) {
      setError(formatApiError(err));
      setStatus('error');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      void listAddressProvinces()
        .then(setProvinces)
        .catch((err) => setError(formatApiError(err)));
    }, [load]),
  );

  useEffect(() => {
    if (!form.provinceId) return;
    let active = true;
    void listAddressDistricts(Number(form.provinceId)).then(
      (rows) => {
        if (active) {
          setDistricts(rows);
          setDistrictsLoading(false);
        }
      },
      (err: unknown) => {
        if (active) {
          setError(formatApiError(err));
          setDistrictsLoading(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [form.provinceId]);

  useEffect(() => {
    if (!form.districtId) return;
    let active = true;
    void listAddressNeighborhoods(Number(form.districtId)).then(
      (rows) => {
        if (active) {
          setNeighborhoods(rows);
          setNeighborhoodsLoading(false);
        }
      },
      (err: unknown) => {
        if (active) {
          setError(formatApiError(err));
          setNeighborhoodsLoading(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [form.districtId]);

  const initialMapPoint: AddressMapPoint | null =
    editingId && form.locationConfirmed && form.latitude && form.longitude
      ? { latitude: Number(form.latitude), longitude: Number(form.longitude) }
      : null;

  const active = list.find((item) => item.id === selectedId) ?? null;
  const provinceCenter =
    selectedProvince?.centerLatitude !== undefined && selectedProvince.centerLongitude !== undefined
      ? {
          latitude: selectedProvince.centerLatitude,
          longitude: selectedProvince.centerLongitude,
        }
      : null;

  function openNew() {
    setForm(emptyAddressForm());
    setDistricts([]);
    setNeighborhoods([]);
    setDistrictsLoading(false);
    setNeighborhoodsLoading(false);
    setEditingId('new');
    setServiceNote(null);
    setError(null);
    setLocationError(null);
    setDevicePoint(null);
  }

  function openEdit(address: CustomerAddress) {
    setDistrictsLoading(
      Boolean(address.provinceId && String(address.provinceId) !== form.provinceId),
    );
    setNeighborhoodsLoading(
      Boolean(address.districtId && String(address.districtId) !== form.districtId),
    );
    setForm(addressToForm(address));
    setEditingId(address.id);
    setSelectedId(address.id);
    setServiceNote(null);
    setError(null);
    setLocationError(null);
    setDevicePoint(null);
  }

  function closeComposer() {
    setEditingId(null);
    setServiceNote(null);
    setError(null);
  }

  function showPicker(kind: 'province' | 'district' | 'neighborhood') {
    setOptionSearch('');
    setActivePicker(kind);
  }

  function chooseOption(id: number, name: string) {
    if (activePicker === 'province') {
      setDistricts([]);
      setNeighborhoods([]);
      setDistrictsLoading(true);
      setNeighborhoodsLoading(false);
      setForm((current) => ({
        ...current,
        provinceId: String(id),
        city: name,
        districtId: '',
        district: '',
        neighborhoodId: '',
      }));
    } else if (activePicker === 'district') {
      setNeighborhoods([]);
      setNeighborhoodsLoading(true);
      setForm((current) => ({
        ...current,
        districtId: String(id),
        district: name,
        neighborhoodId: '',
      }));
    } else {
      setForm((current) => ({ ...current, neighborhoodId: String(id) }));
    }
    setActivePicker(null);
  }

  async function selectDeviceLocation() {
    if (locating) return;
    setLocating(true);
    setLocationError(null);
    try {
      const point = await getDeviceLocation();
      setDevicePoint(point);
      setForm((current) => ({
        ...current,
        latitude: String(point.latitude),
        longitude: String(point.longitude),
        locationConfirmed: true,
      }));
    } catch (err) {
      setLocationError(deviceLocationMessage(err));
    } finally {
      setLocating(false);
    }
  }

  async function onSave() {
    if (saving || !editingId) return;
    setSaving(true);
    setError(null);
    try {
      let formToSave = form;
      if (editingId === 'new') {
        const profile = await fetchCustomerProfile();
        const recipientPhone = profile.phone?.trim() ?? '';
        if (!/^\+\d{10,15}$/.test(recipientPhone)) {
          throw new Error('Hesap profilinizde geçerli bir telefon bulunamadı.');
        }
        formToSave = {
          ...form,
          recipientName: profile.displayName?.trim() || 'Müşteri',
          recipientPhone,
        };
      }
      const mapped = addressFormToWriteBody(formToSave);
      if (!mapped.ok) {
        setError(mapped.message);
        return;
      }
      if (provinceCenter) {
        const point = {
          latitude: mapped.body.latitude,
          longitude: mapped.body.longitude,
        };
        if (isPointOutsideProvince(point, provinceCenter)) {
          setError(
            `Seçilen konum ${selectedProvince?.name ?? 'seçilen'} sınırları dışında görünüyor. Haritadan konumu yeniden seç.`,
          );
          return;
        }
      }
      try {
        const loc = await checkDeliveryServiceability(
          mapped.body.latitude,
          mapped.body.longitude,
          mapped.body.label ?? mapped.body.street ?? 'Kayıtlı adres',
        );
        setServiceNote(
          loc.serviceable
            ? 'Bu konum teslimat bölgesinde.'
            : 'Bu konum bölge dışında kaydedilebilir; teslimat ücreti sunucuda hesaplanır.',
        );
      } catch {
        setServiceNote('Servis alanı şu an doğrulanamadı. Adres yine kaydedilebilir.');
      }
      if (editingId === 'new') {
        await createCustomerAddress(mapped.body);
      } else {
        await updateCustomerAddress(editingId, mapped.body);
      }
      closeComposer();
      void load();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    const label = list.find((item) => item.id === id)?.label ?? 'bu adresi';
    Alert.alert('Adresi sil', `${label} kalıcı olarak silinecek.`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setSaving(true);
            try {
              await deleteCustomerAddress(id);
              if (editingId === id) closeComposer();
              setSelectedId((current) => (current === id ? null : current));
              void load();
            } catch (err) {
              setError(formatApiError(err));
            } finally {
              setSaving(false);
            }
          })();
        },
      },
    ]);
  }

  if (status === 'loading') return <LoadingBlock label="Adresler yükleniyor…" />;
  if (status === 'error')
    return <ErrorBlock title="Adresler yüklenemedi" message={error ?? ''} onRetry={load} />;

  return (
    <View style={styles.flex}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: space.margin,
          paddingBottom: insets.bottom + 32,
          gap: space.md,
        }}
      >
        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>ADRES DEFTERİ</Text>
            <Text style={styles.heroTitle}>Neresi getirelim?</Text>
            <Text style={styles.heroSub}>
              {list.length === 0
                ? 'İlk teslimat noktanı haritadan işaretle.'
                : `${list.length} kayıtlı teslimat noktası. Bir adrese dokun, haritada gör.`}
            </Text>
          </View>
          <MustardButton label="Yeni adres ekle" onPress={openNew} />
        </View>

        <View style={styles.mapCard}>
          <AddressLocationPicker
            readOnly
            focusPoint={active ? { latitude: active.latitude, longitude: active.longitude } : null}
          />
        </View>

        {list.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Henüz adres yok</Text>
            <Text style={styles.emptyBody}>
              Cihazının konumunu kullan ya da haritadan dokunarak ilk adresini ekle.
            </Text>
            <MustardButton label="+ Yeni adres ekle" onPress={openNew} />
          </View>
        ) : (
          list.map((address) => {
            const note = notes[address.id] ?? {
              tone: 'unknown' as const,
              label: 'Kontrol edilemedi',
            };
            const isActive = active?.id === address.id;
            return (
              <Pressable
                key={address.id}
                onPress={() => setSelectedId(address.id)}
                style={[styles.card, isActive && styles.cardActive]}
                accessibilityRole="button"
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle}>{address.label || 'Adres'}</Text>
                    {address.isDefault ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>Birincil</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={[styles.pill, { backgroundColor: notePill[note.tone].background }]}>
                    <Text style={[styles.pillText, { color: notePill[note.tone].color }]}>
                      {note.label}
                    </Text>
                  </View>
                </View>

                <Text style={styles.cardPlace}>{addressLine(address)}</Text>
                {address.deliveryNote ? (
                  <Text style={styles.cardNote}>Tarif · {address.deliveryNote}</Text>
                ) : null}
                <View style={styles.cardActions}>
                  <Pressable
                    style={styles.action}
                    accessibilityRole="button"
                    onPress={() => openEdit(address)}
                  >
                    <Text style={styles.actionText}>Düzenle</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.action, styles.actionDanger]}
                    accessibilityRole="button"
                    onPress={() => void onDelete(address.id)}
                  >
                    <Text style={[styles.actionText, { color: colors.error }]}>Sil</Text>
                  </Pressable>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={editingId !== null}
        animationType="slide"
        onRequestClose={closeComposer}
        presentationStyle="fullScreen"
      >
        <View style={styles.composerRoot}>
          <View style={[styles.composerHeader, { paddingTop: insets.top + space.sm }]}>
            <View>
              <Text style={styles.eyebrow}>{editingId === 'new' ? 'YENİ KAYIT' : 'DÜZENLE'}</Text>
              <Text style={styles.composerTitle}>
                {editingId === 'new' ? 'Adres ekle' : 'Adresi düzenle'}
              </Text>
            </View>
            <Pressable
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Kapat"
              onPress={closeComposer}
            >
              <Text style={styles.closeGlyph}>×</Text>
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: space.margin, gap: space.md, paddingBottom: 140 }}
          >
            <FormField
              label="Adres ismi"
              value={form.label}
              onChangeText={(label) => setForm((c) => ({ ...c, label }))}
            />

            <View style={styles.mapCard}>
              <View style={styles.locateRow}>
                <Pressable
                  style={[styles.locateButton, locating && styles.disabled]}
                  accessibilityRole="button"
                  onPress={() => void selectDeviceLocation()}
                >
                  <Text style={styles.locateText}>
                    {locating ? 'Konum alınıyor…' : 'Konumumu bul'}
                  </Text>
                </Pressable>
                {locationError ? (
                  <Text style={styles.error}>{locationError}</Text>
                ) : (
                  <Text style={styles.hint}>Tarayıcı/telefon iznini ver.</Text>
                )}
              </View>
              <View style={{ marginTop: space.md }}>
                <AddressLocationPicker
                  initialPoint={initialMapPoint}
                  center={provinceCenter}
                  focusPoint={devicePoint}
                  onSelect={(point) =>
                    setForm((current) => ({
                      ...current,
                      latitude: String(point.latitude),
                      longitude: String(point.longitude),
                      locationConfirmed: true,
                    }))
                  }
                />
              </View>
            </View>

            <Pressable
              style={styles.selector}
              onPress={() => showPicker('province')}
              accessibilityRole="button"
            >
              <Text style={styles.selectorLabel}>İl</Text>
              <Text style={styles.selectorValue}>{selectedProvince?.name ?? 'İl seçin'}</Text>
            </Pressable>
            <Pressable
              style={[styles.selector, (!form.provinceId || districtsLoading) && styles.disabled]}
              disabled={!form.provinceId || districtsLoading}
              onPress={() => showPicker('district')}
              accessibilityRole="button"
            >
              <Text style={styles.selectorLabel}>İlçe</Text>
              <Text style={styles.selectorValue}>
                {districtsLoading ? 'İlçeler yükleniyor…' : form.district || 'İlçe seçin'}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.selector,
                (!form.districtId || neighborhoodsLoading) && styles.disabled,
              ]}
              disabled={!form.districtId || neighborhoodsLoading}
              onPress={() => showPicker('neighborhood')}
              accessibilityRole="button"
            >
              <Text style={styles.selectorLabel}>Mahalle</Text>
              <Text style={styles.selectorValue}>
                {neighborhoodsLoading
                  ? 'Mahalleler yükleniyor…'
                  : (neighborhoods.find((item) => String(item.id) === form.neighborhoodId)?.name ??
                    'Mahalle seçin')}
              </Text>
            </Pressable>

            <FormField
              label="Cadde"
              value={form.avenue}
              onChangeText={(avenue) => setForm((c) => ({ ...c, avenue }))}
            />
            <FormField
              label="Sokak"
              value={form.street}
              onChangeText={(street) => setForm((c) => ({ ...c, street }))}
            />
            <FormField
              label="Bina no / isim"
              value={form.buildingNumber}
              onChangeText={(buildingNumber) => setForm((c) => ({ ...c, buildingNumber }))}
            />
            <FormField
              label="Kat"
              value={form.floor}
              onChangeText={(floor) => setForm((c) => ({ ...c, floor }))}
            />
            <FormField
              label="Daire no"
              value={form.apartmentNumber}
              onChangeText={(apartmentNumber) => setForm((c) => ({ ...c, apartmentNumber }))}
            />
            <FormField
              label="Kapı / asansör kodu"
              value={form.accessCode}
              onChangeText={(accessCode) => setForm((c) => ({ ...c, accessCode }))}
            />
            <FormField
              label="Adres tarifi olarak"
              value={form.deliveryNote}
              onChangeText={(deliveryNote) => setForm((c) => ({ ...c, deliveryNote }))}
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Varsayılan adres</Text>
              <Switch
                value={form.isDefault}
                onValueChange={(value) => setForm((c) => ({ ...c, isDefault: value }))}
                trackColor={{ false: colors.surfaceHighest, true: colors.mustardPressed }}
                thumbColor={form.isDefault ? colors.mustard : colors.ash}
              />
            </View>

            {serviceNote ? <Text style={styles.hint}>{serviceNote}</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>

          <View style={[styles.composerFooter, { paddingBottom: insets.bottom + space.sm }]}>
            <MustardButton
              label={editingId === 'new' ? 'Adresi kaydet' : 'Değişiklikleri kaydet'}
              loading={saving}
              disabled={!form.locationConfirmed}
              onPress={() => void onSave()}
            />
            <SecondaryButton label="Vazgeç" onPress={closeComposer} />
          </View>

          <Modal
            visible={activePicker !== null}
            animationType="slide"
            transparent
            onRequestClose={() => setActivePicker(null)}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.modalSheet}>
                <Text style={styles.modalTitle}>
                  {activePicker === 'province'
                    ? 'İl seçin'
                    : activePicker === 'district'
                      ? 'İlçe seçin'
                      : 'Mahalle seçin'}
                </Text>
                {activePicker !== 'neighborhood' ? (
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Ara"
                    placeholderTextColor={colors.ash}
                    value={optionSearch}
                    onChangeText={setOptionSearch}
                  />
                ) : null}
                <FlatList
                  data={filteredOptions}
                  keyExtractor={(item) => String(item.id)}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.optionRow}
                      accessibilityRole="button"
                      onPress={() => chooseOption(item.id, item.name)}
                    >
                      <Text style={styles.optionText}>{item.name}</Text>
                    </Pressable>
                  )}
                  ListEmptyComponent={<Text style={styles.hint}>Seçenek bulunamadı.</Text>}
                />
                <SecondaryButton label="Kapat" onPress={() => setActivePicker(null)} />
              </View>
            </View>
          </Modal>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  hero: { gap: space.md },
  heroCopy: { gap: 4 },
  eyebrow: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.mustardGlow,
  },
  heroTitle: { fontFamily: fonts.anton, fontSize: 28, lineHeight: 32, color: colors.onSurface },
  heroSub: { fontFamily: fonts.jakarta, fontSize: 13, lineHeight: 20, color: colors.ash },
  mapCard: {
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    gap: space.sm,
  },
  card: {
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.hairline,
    gap: space.sm,
  },
  cardActive: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(254,179,0,0.45)',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 1 },
  cardTitle: { fontFamily: fonts.jakartaBold, fontSize: 15, color: colors.onSurface },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: 'rgba(254,179,0,0.15)',
  },
  badgeText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.mustardGlow,
  },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  pillText: { fontFamily: fonts.jakartaBold, fontSize: 10, letterSpacing: 0.8 },
  cardPlace: { fontFamily: fonts.jakarta, fontSize: 15, lineHeight: 22, color: colors.onSurface },
  cardNote: { fontFamily: fonts.jakarta, fontSize: 13, lineHeight: 20, color: colors.ash },
  cardActions: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.xs,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    paddingTop: space.sm,
  },
  action: {
    minHeight: minTouch,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  actionDanger: { borderColor: 'rgba(255,180,171,0.35)' },
  actionText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 12,
    letterSpacing: 0.7,
    color: colors.onSurface,
  },
  empty: {
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.hairline,
    backgroundColor: colors.surfaceLow,
    gap: space.sm,
  },
  emptyTitle: { fontFamily: fonts.jakartaBold, fontSize: 18, color: colors.onSurface },
  emptyBody: { fontFamily: fonts.jakarta, fontSize: 13, lineHeight: 20, color: colors.ash },
  composerRoot: { flex: 1, backgroundColor: colors.canvas },
  composerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: space.margin,
    paddingBottom: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  composerTitle: { fontFamily: fonts.anton, fontSize: 24, lineHeight: 28, color: colors.onSurface },
  closeButton: {
    width: minTouch,
    height: minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  closeGlyph: { fontSize: 22, lineHeight: 26, color: colors.onSurfaceVariant },
  composerFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: space.sm,
    paddingHorizontal: space.margin,
    paddingTop: space.md,
    backgroundColor: colors.surfaceLow,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  locateRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  locateButton: {
    minHeight: minTouch,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  locateText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 12,
    letterSpacing: 0.7,
    color: colors.onSurface,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  switchLabel: { flex: 1, fontFamily: fonts.jakarta, fontSize: 14, color: colors.onSurface },
  selector: {
    minHeight: minTouch,
    paddingHorizontal: space.md,
    paddingVertical: 9,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.hairline,
    justifyContent: 'center',
    gap: 2,
  },
  selectorLabel: {
    fontFamily: fonts.jakartaBold,
    fontSize: 10,
    color: colors.ash,
    letterSpacing: 0.9,
  },
  selectorValue: { fontFamily: fonts.jakarta, fontSize: 15, color: colors.onSurface },
  disabled: { opacity: 0.45 },
  hint: { fontFamily: fonts.jakarta, fontSize: 12, lineHeight: 18, color: colors.ash },
  error: { fontFamily: fonts.jakarta, fontSize: 13, lineHeight: 20, color: colors.error },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0008' },
  modalSheet: {
    maxHeight: '82%',
    padding: space.md,
    gap: space.sm,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  modalTitle: { fontFamily: fonts.jakartaBold, fontSize: 18, color: colors.onSurface },
  searchInput: {
    minHeight: minTouch,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    paddingHorizontal: space.md,
    color: colors.onSurface,
    fontFamily: fonts.jakarta,
    fontSize: 16,
  },
  optionRow: {
    minHeight: minTouch,
    justifyContent: 'center',
    paddingHorizontal: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  optionText: { fontFamily: fonts.jakarta, fontSize: 15, color: colors.onSurface },
});
