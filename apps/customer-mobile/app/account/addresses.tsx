import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  MustardButton,
  SecondaryButton,
} from '../../components/ui';
import { fetchCustomerProfile } from '../../lib/account';
import {
  addressFormToWriteBody,
  addressLine,
  addressToForm,
  emptyAddressForm,
  type AddressForm,
} from '../../lib/address-map';
import type { AddressMapPoint } from '../../lib/address-map-html';
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
import type { CustomerAddress } from '../../lib/schemas';
import { colors, fonts, minTouch, radius, space } from '../../theme';

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
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<AddressForm>(emptyAddressForm);
  const [saving, setSaving] = useState(false);
  const [serviceNote, setServiceNote] = useState<string | null>(null);
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

  const load = useCallback(() => {
    setStatus('loading');
    void listCustomerAddresses()
      .then((rows) => {
        setList(rows);
        setStatus('ready');
        setError(null);
      })
      .catch((err) => {
        setError(formatApiError(err));
        setStatus('error');
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      void listAddressProvinces()
        .then(setProvinces)
        .catch((err) => setError(formatApiError(err)));
    }, [load]),
  );

  useEffect(() => {
    if (!form.provinceId) return;
    let active = true;
    void listAddressDistricts(Number(form.provinceId))
      .then((rows) => {
        if (active) {
          setDistricts(rows);
          setDistrictsLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(formatApiError(err));
          setDistrictsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [form.provinceId]);

  useEffect(() => {
    if (!form.districtId) return;
    let active = true;
    void listAddressNeighborhoods(Number(form.districtId))
      .then((rows) => {
        if (active) {
          setNeighborhoods(rows);
          setNeighborhoodsLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(formatApiError(err));
          setNeighborhoodsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [form.districtId]);

  function openNew() {
    setForm(emptyAddressForm());
    setDistricts([]);
    setNeighborhoods([]);
    setDistrictsLoading(false);
    setNeighborhoodsLoading(false);
    setEditingId('new');
    setServiceNote(null);
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
    setServiceNote(null);
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
        locationConfirmed: false,
        latitude: '',
        longitude: '',
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
    } else if (activePicker === 'neighborhood') {
      setForm((current) => ({ ...current, neighborhoodId: String(id) }));
    }
    setActivePicker(null);
  }

  const initialMapPoint: AddressMapPoint | null =
    editingId && form.locationConfirmed && form.latitude && form.longitude
      ? { latitude: Number(form.latitude), longitude: Number(form.longitude) }
      : null;

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
      setEditingId(null);
      load();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (saving) return;
    setSaving(true);
    try {
      await deleteCustomerAddress(id);
      setEditingId(null);
      load();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading') return <LoadingBlock label="Adresler yükleniyor…" />;
  if (status === 'error')
    return <ErrorBlock title="Adresler yüklenemedi" message={error ?? ''} onRetry={load} />;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: space.margin,
          paddingBottom: insets.bottom + 32,
          gap: 12,
        }}
      >
        {list.length === 0 && editingId == null ? (
          <EmptyBlock title="Kayıtlı adres yok" message="Teslimat için bir adres ekle." />
        ) : null}

        {list.map((address) => (
          <Pressable
            key={address.id}
            onPress={() => openEdit(address)}
            style={styles.card}
            accessibilityRole="button"
          >
            <Text style={styles.title}>
              {address.label || 'Adres'}
              {address.isDefault ? ' · Varsayılan' : ''}
            </Text>
            <Text style={styles.sub}>{addressLine(address)}</Text>
          </Pressable>
        ))}

        {editingId == null ? <MustardButton label="+ Yeni adres ekle" onPress={openNew} /> : null}

        {editingId != null ? (
          <View style={styles.form}>
            <FormField
              label="Adres ismi"
              value={form.label}
              onChangeText={(label) => setForm((c) => ({ ...c, label }))}
            />
            <AddressLocationPicker
              initialPoint={initialMapPoint}
              center={
                selectedProvince?.centerLatitude !== undefined &&
                selectedProvince.centerLongitude !== undefined
                  ? {
                      latitude: selectedProvince.centerLatitude,
                      longitude: selectedProvince.centerLongitude,
                    }
                  : null
              }
              onSelect={(point) =>
                setForm((current) => ({
                  ...current,
                  latitude: String(point.latitude),
                  longitude: String(point.longitude),
                  locationConfirmed: true,
                }))
              }
            />
            <Text style={styles.sub} accessibilityLiveRegion="polite">
              {form.locationConfirmed
                ? `Harita konumu: ${Number(form.latitude).toFixed(6)}, ${Number(form.longitude).toFixed(6)}`
                : 'Adres kaydı için haritadan bir konum seçmelisin.'}
            </Text>
            <Pressable style={styles.selector} onPress={() => showPicker('province')}>
              <Text style={styles.selectorLabel}>İl</Text>
              <Text style={styles.selectorValue}>{selectedProvince?.name ?? 'İl seçin'}</Text>
            </Pressable>
            <Pressable
              style={[styles.selector, (!form.provinceId || districtsLoading) && styles.disabled]}
              disabled={!form.provinceId || districtsLoading}
              onPress={() => showPicker('district')}
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
            >
              <Text style={styles.selectorLabel}>Mahalle</Text>
              <Text style={styles.selectorValue}>
                {neighborhoods.find((item) => String(item.id) === form.neighborhoodId)?.name ??
                  (neighborhoodsLoading ? 'Mahalleler yükleniyor…' : 'Mahalle seçin')}
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
              label="Adres tarifi"
              value={form.deliveryNote}
              onChangeText={(deliveryNote) => setForm((c) => ({ ...c, deliveryNote }))}
            />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Varsayılan adres</Text>
              <Switch
                value={form.isDefault}
                onValueChange={(isDefault) => setForm((c) => ({ ...c, isDefault }))}
                trackColor={{ false: colors.surfaceHighest, true: colors.mustardPressed }}
                thumbColor={form.isDefault ? colors.mustard : colors.ash}
              />
            </View>
            {serviceNote ? <Text style={styles.sub}>{serviceNote}</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <MustardButton
              label="Kaydet"
              loading={saving}
              disabled={!form.locationConfirmed}
              onPress={() => void onSave()}
            />
            {editingId !== 'new' ? (
              <SecondaryButton label="Sil" onPress={() => void onDelete(editingId)} />
            ) : null}
            <SecondaryButton
              label="Vazgeç"
              onPress={() => {
                setEditingId(null);
                setError(null);
              }}
            />
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
                        onPress={() => chooseOption(item.id, item.name)}
                      >
                        <Text style={styles.optionText}>{item.name}</Text>
                      </Pressable>
                    )}
                    ListEmptyComponent={<Text style={styles.sub}>Seçenek bulunamadı.</Text>}
                  />
                  <SecondaryButton label="Kapat" onPress={() => setActivePicker(null)} />
                </View>
              </View>
            </Modal>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  card: {
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    gap: 4,
    minHeight: minTouch,
  },
  title: { fontFamily: fonts.jakartaBold, fontSize: 15, color: colors.onSurface },
  sub: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.ash },
  form: { gap: 10, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.surface },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchLabel: { flex: 1, fontFamily: fonts.jakarta, fontSize: 14, color: colors.onSurface },
  error: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.error },
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
    textTransform: 'uppercase',
  },
  selectorValue: { fontFamily: fonts.jakarta, fontSize: 15, color: colors.onSurface },
  disabled: { opacity: 0.45 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0008' },
  modalSheet: {
    maxHeight: '82%',
    padding: space.md,
    gap: 10,
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
