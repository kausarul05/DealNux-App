import { IPA_BASE, SHOP_APPLY } from '@env'
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { NavigationProp, useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import axios from 'axios'
import * as DocumentPicker from 'expo-document-picker'
import React, { useState } from 'react'
import {
    ActivityIndicator,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import AppHeader from '../../components/AppHeader'
import BackButton from '../../components/BackButton'
import { Toast, useToast } from '../../components/useToost'
import { AuthStackParamList } from '../../Navigation/types'

const { width } = Dimensions.get('window');
type AuthNavProp = NativeStackNavigationProp<AuthStackParamList>;

const API_BASE_URL = IPA_BASE;
const END_POINTS = SHOP_APPLY;

// ─── Types ────────────────────────────────────────────────────────────────────
interface SellerFormData {
    tradeName: string;
    legalType: string;
    registrationNumber: string;
    fullName: string;
    jobTitle: string;
    contactEmail: string;
    contactPhone: string;
    categories: string[];
    otherCategory: string;
    skuCount: string;
    priceMin: string;
    priceMax: string;
    productTypes: string[];
    inventoryOwnership: string;
    fulfillmentMethods: string[];
    shippingRegions: string[];
    returnPolicyText: string;
    returnPolicyFile: any;
    complianceChecks: Record<string, boolean>;
    prohibitedAgreement: boolean;
    hasPriorHistory: string;
    historyExplanation: string;
    idDocument: any;
    businessLicense: any;
    utilityBill: any;
    signatureName: string;
    certifications: Record<string, boolean>;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const LEGAL_TYPES = [
    'Sole Proprietorship',
    'Limited Liability Company (LLC)',
    'Corporation (C-Corp / S-Corp)',
    'Partnership',
    'Non-Profit Organization',
    'Other',
];

const CATEGORIES = [
    'Arts, Crafts & Collectibles',
    'Automotive',
    'Baby & Kids',
    'Books & Entertainment',
    'Digital Products & Services',
    'Electronics',
    'Financial Products',
    'Food & Grocery',
    'Health & Beauty',
    'Home & Kitchen',
    'Industrial & Professional',
    "Men's Fashion",
    'Office & Business',
    'Real Estate & Home Services',
    'Sports & Outdoors',
    'Travel & Experiences',
    'Wedding & Events',
    "Women's Fashion",
    'Other'
];

const SKU_COUNTS = ['1 – 10', '11 – 50', '51 – 200', '201 – 500', '500+'];
const PRODUCT_TYPES = ['New', 'Refurbished', 'Used'];

const FULFILLMENT_METHODS = [
    { value: 'self', label: 'Self-fulfilled', description: 'I pack and ship orders myself' },
    { value: '3pl', label: 'Third-Party Logistics (3PL)', description: 'A fulfillment center handles shipping' },
    { value: 'dropship', label: 'Dropshipping', description: 'Supplier ships directly to buyer' },
    { value: 'pickup', label: 'Local Pickup', description: 'Buyers collect in person' },
];

const SHIPPING_REGIONS = [
    { value: 'local', label: 'Local', description: 'Within city / town only' },
    { value: 'regional', label: 'Regional', description: 'Within state / province' },
    { value: 'nationwide', label: 'Nationwide', description: 'Across the entire country' },
    { value: 'international', label: 'International', description: 'Cross-border shipping' },
];

const COMPLIANCE_ITEMS = [
    { key: 'seller_terms', label: 'I have read and agree to the DealNux Seller Terms and Conditions.' },
    { key: 'privacy_policy', label: 'I have read and agree to the DealNux Privacy Policy and understand how customer data is handled.' },
    { key: 'tax_compliance', label: 'I understand my tax obligations and will comply with all applicable tax laws.' },
    { key: 'authenticity', label: 'All products I list will be authentic and accurately described.' },
    { key: 'quality_standards', label: 'I will maintain quality standards and handle customer complaints professionally.' },
];

const CERTIFICATION_ITEMS = [
    { key: 'truthful_info', label: 'I certify that all information provided in this application is true and accurate to the best of my knowledge.' },
    { key: 'agree_policies', label: 'I agree to comply with all DealNux policies, including the Prohibited Items Policy and Code of Conduct.' },
    { key: 'authorized_representative', label: 'I am an authorized representative of the business and have the authority to submit this application.' },
    { key: 'understand_terms', label: 'I understand that providing false information may result in immediate rejection or future termination of my seller account.' },
];

const PROHIBITED = [
    'Firearms, weapons, ammunition, and related accessories',
    'Controlled substances, illegal drugs, and drug paraphernalia',
    'Adult content, pornographic materials, and sexually explicit items',
    'Counterfeit, replica, or trademark-infringing branded goods',
    'Hazardous materials, chemicals, and flammable substances',
    'Stolen goods, property of unknown origin, or goods obtained illegally',
    'Items that infringe on intellectual property, patents, or copyrights',
    'Prescription medications and medical devices without proper authorization',
    'Live animals (unless specifically authorized by DealNux)',
    'Tobacco products and e-cigarettes (unless licensed and authorized)',
    'Alcohol (unless specifically permitted under applicable law and DealNux policy)',
    'Items associated with hate speech, discrimination, or violence',
];

const STEPS = [
    { number: 1, label: 'Business', description: 'Business Details' },
    { number: 2, label: 'Contact', description: 'Primary Contact' },
    { number: 3, label: 'Catalog', description: 'Product Catalog' },
    { number: 4, label: 'Fulfillment', description: 'Fulfillment & Shipping' },
    { number: 5, label: 'Returns', description: 'Return Policy' },
    { number: 6, label: 'Compliance', description: 'Compliance' },
    { number: 7, label: 'Prohibited', description: 'Prohibited Items' },
    { number: 8, label: 'History', description: 'History & Documents' },
    { number: 9, label: 'Review', description: 'Review' },
    { number: 10, label: 'Signature', description: 'Digital Signature' },
    { number: 11, label: 'Certify', description: 'Final Certification' },
];

// ─── Step Components ─────────────────────────────────────────────────────────

// Step 1: Business Details
const Step1BusinessDetails = ({ data, onChange }: { data: SellerFormData; onChange: (updates: Partial<SellerFormData>) => void }) => (
    <View style={styles.stepContainer}>
        <View style={styles.headerRow}>
            <View style={styles.iconContainer}>
                <Ionicons name="business-outline" size={20} color="#2355B6" />
            </View>
            <View>
                <Text style={styles.stepTitle}>Business Details</Text>
                <Text style={styles.stepSubtitle}>Tell us about your business entity</Text>
            </View>
        </View>

        <View style={styles.inputGroup}>
            <Text style={styles.label}>Trade / Business Name <Text style={styles.required}>*</Text></Text>
            <TextInput
                value={data.tradeName}
                onChangeText={(text) => onChange({ tradeName: text })}
                placeholder="e.g. Sunrise Electronics"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
            />
            <Text style={styles.hintText}>The name customers will see on DealNux</Text>
        </View>

        <View style={styles.inputGroup}>
            <Text style={styles.label}>Legal Business Type <Text style={styles.required}>*</Text></Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {LEGAL_TYPES.map((item) => (
                    <TouchableOpacity
                        key={item}
                        onPress={() => onChange({ legalType: item })}
                        style={[styles.chip, data.legalType === item && styles.chipActive]}
                    >
                        <Text style={[styles.chipText, data.legalType === item && styles.chipTextActive]}>
                            {item}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>

        <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Registration Number <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
                value={data.registrationNumber}
                onChangeText={(text) => onChange({ registrationNumber: text })}
                placeholder="e.g. 12-3456789 or EIN"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
            />
            <Text style={styles.hintText}>EIN, state registration number, or equivalent business identifier</Text>
        </View>

        <View style={styles.infoBox}>
            <Text style={styles.infoBoxText}>Note: Your business name and legal type will be reviewed by our team. You may be asked to provide supporting documents during verification.</Text>
        </View>
    </View>
);

// Step 2: Primary Contact
const Step2PrimaryContact = ({ data, onChange }: { data: SellerFormData; onChange: (updates: Partial<SellerFormData>) => void }) => (
    <View style={styles.stepContainer}>
        <View style={styles.headerRow}>
            <View style={styles.iconContainer}>
                <Ionicons name="person-circle-outline" size={20} color="#2355B6" />
            </View>
            <View>
                <Text style={styles.stepTitle}>Primary Contact</Text>
                <Text style={styles.stepSubtitle}>Who should we contact regarding your seller account?</Text>
            </View>
        </View>

        <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
            <TextInput
                value={data.fullName}
                onChangeText={(text) => onChange({ fullName: text })}
                placeholder="e.g. Jane Smith"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
            />
        </View>

        <View style={styles.inputGroup}>
            <Text style={styles.label}>Job Title <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
                value={data.jobTitle}
                onChangeText={(text) => onChange({ jobTitle: text })}
                placeholder="e.g. Owner, Manager, Director"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
            />
        </View>

        <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address <Text style={styles.required}>*</Text></Text>
            <TextInput
                value={data.contactEmail}
                onChangeText={(text) => onChange({ contactEmail: text })}
                placeholder="contact@yourbusiness.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
            />
            <Text style={styles.hintText}>We'll send account notifications to this email</Text>
        </View>

        <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number <Text style={styles.required}>*</Text></Text>
            <TextInput
                value={data.contactPhone}
                onChangeText={(text) => onChange({ contactPhone: text })}
                placeholder="e.g. +1 (555) 000-0000"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                style={styles.input}
            />
        </View>

        <View style={styles.infoBoxLight}>
            <Text style={styles.infoBoxTextLight}>This contact information will be used for account communications and may be displayed to buyers for support purposes.</Text>
        </View>
    </View>
);

// Step 3: Product Catalog
const Step3ProductCatalog = ({ data, onChange }: { data: SellerFormData; onChange: (updates: Partial<SellerFormData>) => void }) => {
    const toggleArrayItem = (arr: string[], item: string) => {
        return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
    };

    const showOtherInput = data.categories.includes('Other');

    return (
        <View style={styles.stepContainer}>
            <View style={styles.headerRow}>
                <View style={styles.iconContainer}>
                    <Ionicons name="bag-outline" size={20} color="#2355B6" />
                </View>
                <View>
                    <Text style={styles.stepTitle}>Product Catalog</Text>
                    <Text style={styles.stepSubtitle}>Tell us what you plan to sell on DealNux</Text>
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Product Categories <Text style={styles.required}>*</Text> <Text style={styles.optional}>Select all that apply</Text></Text>
                <View style={styles.chipWrap}>
                    {CATEGORIES.map((cat) => {
                        const selected = data.categories.includes(cat);
                        return (
                            <TouchableOpacity
                                key={cat}
                                onPress={() => onChange({ categories: toggleArrayItem(data.categories, cat) })}
                                style={[styles.chip, selected && styles.chipActive]}
                            >
                                <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                                    {cat}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
                {showOtherInput && (
                    <TextInput
                        value={data.otherCategory}
                        onChangeText={(text) => onChange({ otherCategory: text })}
                        placeholder="Please describe your category..."
                        placeholderTextColor="#9CA3AF"
                        style={[styles.input, styles.mt2]}
                    />
                )}
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Estimated SKU Count <Text style={styles.required}>*</Text></Text>
                <View style={styles.chipWrap}>
                    {SKU_COUNTS.map((count) => (
                        <TouchableOpacity
                            key={count}
                            onPress={() => onChange({ skuCount: count })}
                            style={[styles.chip, data.skuCount === count && styles.chipActive]}
                        >
                            <Text style={[styles.chipText, data.skuCount === count && styles.chipTextActive]}>
                                {count}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <Text style={styles.hintText}>Approximate number of unique products you plan to list</Text>
            </View>

            <View style={styles.row}>
                <View style={[styles.halfInput, styles.mr2]}>
                    <Text style={styles.label}>Min Price (USD) <Text style={styles.required}>*</Text></Text>
                    <View style={styles.priceInput}>
                        <Text style={styles.priceSymbol}>$</Text>
                        <TextInput
                            value={data.priceMin}
                            onChangeText={(text) => onChange({ priceMin: text.replace(/[^0-9.]/g, '') })}
                            placeholder="0"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="numeric"
                            style={styles.priceInputField}
                        />
                    </View>
                </View>
                <View style={styles.halfInput}>
                    <Text style={styles.label}>Max Price (USD) <Text style={styles.required}>*</Text></Text>
                    <View style={styles.priceInput}>
                        <Text style={styles.priceSymbol}>$</Text>
                        <TextInput
                            value={data.priceMax}
                            onChangeText={(text) => onChange({ priceMax: text.replace(/[^0-9.]/g, '') })}
                            placeholder="0"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="numeric"
                            style={styles.priceInputField}
                        />
                    </View>
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Product Condition <Text style={styles.required}>*</Text> <Text style={styles.optional}>Select all that apply</Text></Text>
                <View style={styles.chipWrap}>
                    {PRODUCT_TYPES.map((type) => {
                        const selected = data.productTypes.includes(type);
                        return (
                            <TouchableOpacity
                                key={type}
                                onPress={() => onChange({ productTypes: toggleArrayItem(data.productTypes, type) })}
                                style={[styles.chip, selected && styles.chipActive]}
                            >
                                <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                                    {type}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Do you own the inventory you plan to sell? <Text style={styles.required}>*</Text></Text>
                <View style={styles.row}>
                    {['yes', 'no'].map((val) => (
                        <TouchableOpacity
                            key={val}
                            onPress={() => onChange({ inventoryOwnership: val })}
                            style={[styles.halfButton, data.inventoryOwnership === val && styles.halfButtonActive]}
                        >
                            <Text style={[styles.halfButtonText, data.inventoryOwnership === val && styles.halfButtonTextActive]}>
                                {val === 'yes' ? 'Yes, I own my inventory' : 'No (Dropshipping)'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </View>
    );
};

// Step 4: Fulfillment
const Step4Fulfillment = ({ data, onChange }: { data: SellerFormData; onChange: (updates: Partial<SellerFormData>) => void }) => {
    const toggleItem = (arr: string[], val: string) => {
        return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
    };

    const CheckCard = ({ label, description, selected, onPress }: any) => (
        <TouchableOpacity onPress={onPress} style={[styles.checkCard, selected && styles.checkCardActive]}>
            <View style={[styles.checkbox, selected && styles.checkboxActive]}>
                {selected && <Feather name="check" size={12} color="white" />}
            </View>
            <View style={styles.checkCardContent}>
                <Text style={[styles.checkCardLabel, selected && styles.checkCardLabelActive]}>{label}</Text>
                <Text style={styles.checkCardDesc}>{description}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.stepContainer}>
            <View style={styles.headerRow}>
                <View style={styles.iconContainer}>
                    <Ionicons name="car-outline" size={20} color="#2355B6" />
                </View>
                <View>
                    <Text style={styles.stepTitle}>Fulfillment & Shipping</Text>
                    <Text style={styles.stepSubtitle}>How will you fulfill orders and where do you ship?</Text>
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Fulfillment Method <Text style={styles.required}>*</Text> <Text style={styles.optional}>Select all that apply</Text></Text>
                {FULFILLMENT_METHODS.map((method) => (
                    <CheckCard
                        key={method.value}
                        label={method.label}
                        description={method.description}
                        selected={data.fulfillmentMethods.includes(method.value)}
                        onPress={() => onChange({ fulfillmentMethods: toggleItem(data.fulfillmentMethods, method.value) })}
                    />
                ))}
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Shipping Regions <Text style={styles.required}>*</Text> <Text style={styles.optional}>Select all that apply</Text></Text>
                {SHIPPING_REGIONS.map((region) => (
                    <CheckCard
                        key={region.value}
                        label={region.label}
                        description={region.description}
                        selected={data.shippingRegions.includes(region.value)}
                        onPress={() => onChange({ shippingRegions: toggleItem(data.shippingRegions, region.value) })}
                    />
                ))}
            </View>

            <View style={[styles.infoBox, styles.infoBoxAmber]}>
                <Text style={[styles.infoBoxText, styles.infoBoxTextAmber]}>Tip: You can configure detailed shipping rates, pickup addresses, and delivery timeframes in your Seller Dashboard after your account is approved.</Text>
            </View>
        </View>
    );
};

// Step 5: Return Policy
const Step5ReturnPolicy = ({ data, onChange, onFilePick }: { data: SellerFormData; onChange: (updates: Partial<SellerFormData>) => void; onFilePick: (type: string) => void }) => (
    <View style={styles.stepContainer}>
        <View style={styles.headerRow}>
            <View style={styles.iconContainer}>
                <Ionicons name="refresh-outline" size={20} color="#2355B6" />
            </View>
            <View>
                <Text style={styles.stepTitle}>Return Policy</Text>
                <Text style={styles.stepSubtitle}>Define your return and refund policy for buyers</Text>
            </View>
        </View>

        <View style={styles.inputGroup}>
            <Text style={styles.label}>Return Policy Description <Text style={styles.required}>*</Text></Text>
            <TextInput
                value={data.returnPolicyText}
                onChangeText={(text) => onChange({ returnPolicyText: text })}
                placeholder="Describe your return policy in detail..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                style={styles.textArea}
            />
            <View style={styles.characterCount}>
                <Text style={styles.hintText}>Minimum 50 characters</Text>
                <Text style={[styles.charCount, data.returnPolicyText.length < 50 ? styles.charCountWarning : styles.charCountSuccess]}>
                    {data.returnPolicyText.length} characters
                </Text>
            </View>
        </View>

        <View style={styles.inputGroup}>
            <Text style={styles.label}>Upload Policy Document <Text style={styles.optional}>(optional)</Text></Text>
            <Text style={styles.hintText}>Upload a PDF or Word document of your full return policy (max 5MB)</Text>

            {data.returnPolicyFile ? (
                <View style={styles.fileCard}>
                    <Feather name="file-text" size={20} color="#16A34A" />
                    <View style={styles.fileInfo}>
                        <Text style={styles.fileName}>{data.returnPolicyFile.name}</Text>
                        <Text style={styles.fileSize}>{(data.returnPolicyFile.size / 1024).toFixed(1)} KB</Text>
                    </View>
                    <TouchableOpacity onPress={() => onChange({ returnPolicyFile: null })}>
                        <Feather name="x" size={18} color="#16A34A" />
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity onPress={() => onFilePick('returnPolicyFile')} style={styles.uploadArea}>
                    <Feather name="upload" size={24} color="#9CA3AF" />
                    <Text style={styles.uploadText}>Click to upload document</Text>
                    <Text style={styles.uploadSubtext}>PDF, DOC, DOCX up to 5MB</Text>
                </TouchableOpacity>
            )}
        </View>

        <View style={[styles.infoBox, styles.infoBoxBlue]}>
            <Text style={[styles.infoBoxText, styles.infoBoxTextBlue]}>Your return policy will be displayed on all your product listings and at checkout. A clear, fair policy builds buyer trust and reduces disputes.</Text>
        </View>
    </View>
);

// Step 6: Compliance
const Step6Compliance = ({ data, onChange }: { data: SellerFormData; onChange: (updates: Partial<SellerFormData>) => void }) => {
    const allChecked = COMPLIANCE_ITEMS.every((item) => data.complianceChecks[item.key]);

    const toggle = (key: string) => {
        onChange({
            complianceChecks: {
                ...data.complianceChecks,
                [key]: !data.complianceChecks[key],
            },
        });
    };

    const checkAll = () => {
        const all: Record<string, boolean> = {};
        COMPLIANCE_ITEMS.forEach((item) => (all[item.key] = true));
        onChange({ complianceChecks: all });
    };

    return (
        <View style={styles.stepContainer}>
            <View style={styles.headerRow}>
                <View style={styles.iconContainer}>
                    <Ionicons name="shield-checkmark-outline" size={20} color="#2355B6" />
                </View>
                <View>
                    <Text style={styles.stepTitle}>Compliance Agreements</Text>
                    <Text style={styles.stepSubtitle}>Please review and accept all compliance requirements below</Text>
                </View>
            </View>

            <View style={[styles.infoBox, styles.infoBoxAmber]}>
                <Text style={[styles.infoBoxText, styles.infoBoxTextAmber]}>Required: All items must be checked to proceed. Read each statement carefully before agreeing.</Text>
            </View>

            {COMPLIANCE_ITEMS.map((item) => {
                const checked = !!data.complianceChecks[item.key];
                return (
                    <TouchableOpacity key={item.key} onPress={() => toggle(item.key)} style={[styles.checkCard, checked && styles.checkCardActive]}>
                        <View style={[styles.checkbox, checked && styles.checkboxActive]}>
                            {checked && <Feather name="check" size={12} color="white" />}
                        </View>
                        <Text style={[styles.checkCardLabel, checked && styles.checkCardLabelActive, styles.checkCardLabelLarge]}>
                            {item.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}

            <View style={styles.complianceFooter}>
                <Text style={styles.complianceCount}>
                    {COMPLIANCE_ITEMS.filter((i) => data.complianceChecks[i.key]).length} of {COMPLIANCE_ITEMS.length} accepted
                </Text>
                {!allChecked && (
                    <TouchableOpacity onPress={checkAll}>
                        <Text style={styles.acceptAll}>Accept all</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

// Step 7: Prohibited Items
const Step7ProhibitedItems = ({ data, onChange }: { data: SellerFormData; onChange: (updates: Partial<SellerFormData>) => void }) => (
    <View style={styles.stepContainer}>
        <View style={styles.headerRow}>
            <View style={[styles.iconContainer, styles.iconContainerRed]}>
                <Ionicons name="warning-outline" size={20} color="#EF4444" />
            </View>
            <View>
                <Text style={styles.stepTitle}>Prohibited Items Policy</Text>
                <Text style={styles.stepSubtitle}>Review the list of items that are not permitted on DealNux</Text>
            </View>
        </View>

        <View style={[styles.infoBox, styles.infoBoxRed]}>
            <Text style={[styles.infoBoxText, styles.infoBoxTextRed]}>Listing prohibited items may result in immediate account suspension and referral to law enforcement.</Text>
        </View>

        <View style={styles.prohibitedList}>
            <View style={styles.prohibitedHeader}>
                <Text style={styles.prohibitedHeaderText}>Items Prohibited on DealNux</Text>
            </View>
            <ScrollView style={styles.prohibitedScroll} nestedScrollEnabled={true}>
                {PROHIBITED.map((item, index) => (
                    <View key={index} style={styles.prohibitedItem}>
                        <Text style={styles.prohibitedIcon}>✕</Text>
                        <Text style={styles.prohibitedText}>{item}</Text>
                    </View>
                ))}
            </ScrollView>
        </View>

        <TouchableOpacity
            onPress={() => onChange({ prohibitedAgreement: !data.prohibitedAgreement })}
            style={[styles.checkCard, data.prohibitedAgreement && styles.checkCardActive]}
        >
            <View style={[styles.checkbox, data.prohibitedAgreement && styles.checkboxActive]}>
                {data.prohibitedAgreement && <Feather name="check" size={12} color="white" />}
            </View>
            <Text style={[styles.checkCardLabel, data.prohibitedAgreement && styles.checkCardLabelActive, styles.checkCardLabelLarge]}>
                I have read and fully understood the Prohibited Items Policy above. I confirm that I will not list any prohibited items on DealNux.
            </Text>
        </TouchableOpacity>
    </View>
);

// Step 8: Business History & Documents
const Step8BusinessHistory = ({ data, onChange, onFilePick }: { data: SellerFormData; onChange: (updates: Partial<SellerFormData>) => void; onFilePick: (type: string) => void }) => (
    <View style={styles.stepContainer}>
        <View style={styles.headerRow}>
            <View style={styles.iconContainer}>
                <Ionicons name="document-text-outline" size={20} color="#2355B6" />
            </View>
            <View>
                <Text style={styles.stepTitle}>Business History & Documents</Text>
                <Text style={styles.stepSubtitle}>Provide your business history and verification documents</Text>
            </View>
        </View>

        <View style={styles.inputGroup}>
            <Text style={styles.label}>Do you have prior experience selling on other platforms? <Text style={styles.required}>*</Text></Text>
            <View style={styles.row}>
                {['yes', 'no'].map((val) => (
                    <TouchableOpacity
                        key={val}
                        onPress={() => onChange({ hasPriorHistory: val })}
                        style={[styles.halfButton, data.hasPriorHistory === val && styles.halfButtonActive]}
                    >
                        <Text style={[styles.halfButtonText, data.hasPriorHistory === val && styles.halfButtonTextActive]}>
                            {val === 'yes' ? 'Yes' : 'No'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>

        {data.hasPriorHistory === 'yes' && (
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Describe your business history <Text style={styles.required}>*</Text></Text>
                <TextInput
                    value={data.historyExplanation}
                    onChangeText={(text) => onChange({ historyExplanation: text })}
                    placeholder="Describe your business history..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    style={styles.textArea}
                />
            </View>
        )}

        <View style={styles.inputGroup}>
            <Text style={styles.sectionLabel}>Verification Documents</Text>
            <Text style={styles.hintText}>Upload clear, legible copies. Accepted formats: PDF, JPG, PNG (max 10MB each).</Text>

            {[
                { key: 'idDocument', label: 'Government-Issued ID', hint: "Passport, driver's license, or national ID card" },
                { key: 'businessLicense', label: 'Business License', hint: 'State or local business operating license' },
                { key: 'utilityBill', label: 'Utility Bill', hint: 'Recent (within 3 months) utility or bank statement' },
            ].map(({ key, label, hint }) => {
                const file = data[key as keyof typeof data] as any;
                return (
                    <View key={key} style={styles.docGroup}>
                        <Text style={styles.docLabel}>{label} <Text style={styles.required}>*</Text></Text>
                        <Text style={styles.docHint}>{hint}</Text>

                        {file ? (
                            <View style={styles.fileCard}>
                                <Feather name="file-text" size={20} color="#16A34A" />
                                <View style={styles.fileInfo}>
                                    <Text style={styles.fileName}>{file.name}</Text>
                                    <Text style={styles.fileSize}>{(file.size / 1024).toFixed(1)} KB</Text>
                                </View>
                                <TouchableOpacity onPress={() => onChange({ [key]: null })}>
                                    <Feather name="x" size={18} color="#16A34A" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity onPress={() => onFilePick(key)} style={styles.uploadArea}>
                                <Feather name="upload" size={20} color="#9CA3AF" />
                                <Text style={styles.uploadText}>Click to upload {label}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                );
            })}
        </View>

        <View style={[styles.infoBox, styles.infoBoxLight]}>
            <Text style={[styles.infoBoxText, styles.infoBoxTextLight]}>All documents are encrypted and stored securely. They will only be accessed by our verification team.</Text>
        </View>
    </View>
);

// Step 9: Review
const Step9Review = ({ data }: { data: SellerFormData }) => {
    const complianceCount = COMPLIANCE_ITEMS.filter((i) => data.complianceChecks[i.key]).length;

    const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
        <View style={styles.reviewSection}>
            <View style={styles.reviewSectionHeader}>
                <Text style={styles.reviewSectionTitle}>{title}</Text>
            </View>
            <View style={styles.reviewSectionContent}>{children}</View>
        </View>
    );

    const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
        <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>{label}</Text>
            <Text style={styles.reviewValue}>{value || <Text style={styles.reviewEmpty}>Not provided</Text>}</Text>
        </View>
    );

    // Get category names for display
    const allCategories = [...data.categories];
    if (data.otherCategory && !allCategories.includes(data.otherCategory)) {
        allCategories.push(data.otherCategory);
    }

    return (
        <View style={styles.stepContainer}>
            <View style={styles.headerRow}>
                <View style={styles.iconContainer}>
                    <Ionicons name="clipboard-outline" size={20} color="#2355B6" />
                </View>
                <View>
                    <Text style={styles.stepTitle}>Review Your Application</Text>
                    <Text style={styles.stepSubtitle}>Please review all information before submitting</Text>
                </View>
            </View>

            <View style={[styles.infoBox, styles.infoBoxBlue]}>
                <Text style={[styles.infoBoxText, styles.infoBoxTextBlue]}>Review the information below. If anything needs to be corrected, use the Back button.</Text>
            </View>

            <Section title="Business Details">
                <Row label="Trade Name" value={data.tradeName} />
                <Row label="Legal Type" value={data.legalType} />
                <Row label="Reg. Number" value={data.registrationNumber} />
            </Section>

            <Section title="Primary Contact">
                <Row label="Full Name" value={data.fullName} />
                <Row label="Job Title" value={data.jobTitle} />
                <Row label="Email" value={data.contactEmail} />
                <Row label="Phone" value={data.contactPhone} />
            </Section>

            <Section title="Product Catalog">
                <Row label="Categories" value={allCategories.length > 0 ? allCategories.join(', ') : null} />
                <Row label="SKU Count" value={data.skuCount} />
                <Row label="Price Range" value={data.priceMin || data.priceMax ? `$${data.priceMin} – $${data.priceMax}` : null} />
                <Row label="Product Types" value={data.productTypes.length > 0 ? data.productTypes.join(', ') : null} />
                <Row label="Owns Inventory" value={data.inventoryOwnership === 'yes' ? 'Yes' : data.inventoryOwnership === 'no' ? 'No' : null} />
            </Section>

            <Section title="Fulfillment & Shipping">
                <Row label="Fulfillment" value={data.fulfillmentMethods.length > 0 ? data.fulfillmentMethods.join(', ') : null} />
                <Row label="Regions" value={data.shippingRegions.length > 0 ? data.shippingRegions.join(', ') : null} />
            </Section>

            <Section title="Return Policy">
                <Row label="Policy" value={data.returnPolicyText ? (data.returnPolicyText.length > 120 ? data.returnPolicyText.slice(0, 120) + '…' : data.returnPolicyText) : null} />
                <Row label="Document" value={data.returnPolicyFile ? data.returnPolicyFile.name : 'None uploaded'} />
            </Section>

            <Section title="Agreements">
                <Row label="Compliance" value={`${complianceCount} of ${COMPLIANCE_ITEMS.length} accepted`} />
                <Row label="Prohibited Items" value={data.prohibitedAgreement ? 'Agreed' : 'Not agreed'} />
            </Section>

            <Section title="Business History & Documents">
                <Row label="Prior History" value={data.hasPriorHistory === 'yes' ? 'Yes' : data.hasPriorHistory === 'no' ? 'No' : null} />
                <Row label="ID Document" value={data.idDocument ? 'Uploaded' : 'Not uploaded'} />
                <Row label="Business License" value={data.businessLicense ? 'Uploaded' : 'Not uploaded'} />
                <Row label="Utility Bill" value={data.utilityBill ? 'Uploaded' : 'Not uploaded'} />
            </Section>
        </View>
    );
};

// Step 10: Signature
const Step10Signature = ({ data, onChange }: { data: SellerFormData; onChange: (updates: Partial<SellerFormData>) => void }) => (
    <View style={styles.stepContainer}>
        <View style={styles.headerRow}>
            <View style={styles.iconContainer}>
                <Ionicons name="create-outline" size={20} color="#2355B6" />
            </View>
            <View>
                <Text style={styles.stepTitle}>Digital Signature</Text>
                <Text style={styles.stepSubtitle}>Sign your seller application to proceed</Text>
            </View>
        </View>

        <View style={styles.inputGroup}>
            <Text style={styles.label}>Type your full legal name <Text style={styles.required}>*</Text></Text>
            <Text style={styles.hintText}>Enter your name exactly as it appears on your government-issued ID</Text>
            <TextInput
                value={data.signatureName}
                onChangeText={(text) => onChange({ signatureName: text })}
                placeholder="e.g. Jane A. Smith"
                placeholderTextColor="#9CA3AF"
                style={[styles.input, styles.signatureInput]}
            />
        </View>

        {data.signatureName.trim() && (
            <View style={styles.signaturePreview}>
                <View style={styles.signatureCheck}>
                    <Feather name="check" size={12} color="#16A34A" />
                </View>
                <View>
                    <Text style={styles.signaturePreviewLabel}>Signature captured</Text>
                    <Text style={styles.signaturePreviewText}>{data.signatureName}</Text>
                </View>
            </View>
        )}

        <View style={[styles.infoBox, styles.infoBoxAmber]}>
            <Text style={[styles.infoBoxText, styles.infoBoxTextAmber]}>Legal Notice: By typing your name above, you acknowledge that this digital signature carries the same legal weight as a handwritten signature.</Text>
        </View>
    </View>
);

// Step 11: Certification
const Step11Certification = ({ data, onChange, onSubmit, submitting }: { data: SellerFormData; onChange: (updates: Partial<SellerFormData>) => void; onSubmit: () => void; submitting: boolean }) => {
    const allCertified = CERTIFICATION_ITEMS.every((item) => data.certifications[item.key]);

    const toggle = (key: string) => {
        onChange({
            certifications: {
                ...data.certifications,
                [key]: !data.certifications[key],
            },
        });
    };

    return (
        <View style={styles.stepContainer}>
            <View style={styles.headerRow}>
                <View style={styles.iconContainer}>
                    <Ionicons name="ribbon-outline" size={20} color="#2355B6" />
                </View>
                <View>
                    <Text style={styles.stepTitle}>Final Certification</Text>
                    <Text style={styles.stepSubtitle}>Certify your application and submit for review</Text>
                </View>
            </View>

            <View style={[styles.infoBox, styles.infoBoxBlue]}>
                <Text style={[styles.infoBoxText, styles.infoBoxTextBlue]}>This is the final step. After submitting, our team will review your application. You will receive an email notification within 2–5 business days.</Text>
            </View>

            {CERTIFICATION_ITEMS.map((item) => {
                const checked = !!data.certifications[item.key];
                return (
                    <TouchableOpacity key={item.key} onPress={() => toggle(item.key)} style={[styles.checkCard, checked && styles.checkCardActive]}>
                        <View style={[styles.checkbox, checked && styles.checkboxActive]}>
                            {checked && <Feather name="check" size={12} color="white" />}
                        </View>
                        <Text style={[styles.checkCardLabel, checked && styles.checkCardLabelActive, styles.checkCardLabelLarge]}>
                            {item.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}

            <View style={styles.complianceFooter}>
                <Text style={styles.complianceCount}>
                    {CERTIFICATION_ITEMS.filter((i) => data.certifications[i.key]).length} of {CERTIFICATION_ITEMS.length} certified
                </Text>
                {!allCertified && <Text style={styles.certRequired}>All certifications are required to submit</Text>}
            </View>

            <TouchableOpacity
                onPress={onSubmit}
                disabled={!allCertified || submitting}
                style={[styles.submitButton, (!allCertified || submitting) && styles.submitButtonDisabled]}
            >
                {submitting ? (
                    <View style={styles.submitLoading}>
                        <ActivityIndicator color="white" />
                        <Text style={styles.submitButtonText}>Submitting...</Text>
                    </View>
                ) : (
                    <Text style={styles.submitButtonText}>Submit Seller Application</Text>
                )}
            </TouchableOpacity>
        </View>
    );
};

// ─── Step Indicator ──────────────────────────────────────────────────────────
const StepIndicator = ({ currentStep }: { currentStep: number }) => (
    <View style={styles.indicatorContainer}>
        <View style={styles.indicatorRow}>
            <Text style={styles.indicatorStep}>Step {currentStep} of {STEPS.length}</Text>
            <Text style={styles.indicatorDesc}>{STEPS[currentStep - 1].description}</Text>
        </View>
        <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(currentStep / STEPS.length) * 100}%` }]} />
        </View>
    </View>
);

// ─── Main Component ──────────────────────────────────────────────────────────
const ShopCreate = () => {
    const navigation = useNavigation<NavigationProp<AuthNavProp>>();
    const toast = useToast();

    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState<SellerFormData>({
        tradeName: '',
        legalType: '',
        registrationNumber: '',
        fullName: '',
        jobTitle: '',
        contactEmail: '',
        contactPhone: '',
        categories: [],
        otherCategory: '',
        skuCount: '',
        priceMin: '',
        priceMax: '',
        productTypes: [],
        inventoryOwnership: '',
        fulfillmentMethods: [],
        shippingRegions: [],
        returnPolicyText: '',
        returnPolicyFile: null,
        complianceChecks: {},
        prohibitedAgreement: false,
        hasPriorHistory: '',
        historyExplanation: '',
        idDocument: null,
        businessLicense: null,
        utilityBill: null,
        signatureName: '',
        certifications: {},
    });

    const updateForm = (updates: Partial<SellerFormData>) => {
        setFormData((prev) => ({ ...prev, ...updates }));
    };

    const handleFilePick = async (type: string) => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/*', 'application/pdf'],
                copyToCacheDirectory: true,
                multiple: false,
            });

            if (!result.canceled && result.assets?.length > 0) {
                const file = result.assets[0];
                updateForm({ [type]: file });
            }
        } catch (error) {
            toast.show({
                message: 'Failed to pick file',
                type: 'error',
                style: 'top',
            });
        }
    };

    const handleNext = () => {
        if (currentStep < STEPS.length) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    // ─── Submit Handler ──────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        const token = await AsyncStorage.getItem('vToken');
        if (!token) {
            toast.show({ message: 'Token missing', type: 'error', style: 'top' });
            return;
        }

        // Validate required fields
        if (!formData.tradeName.trim()) {
            toast.show({ message: 'Please enter business name', type: 'error', style: 'top' });
            return;
        }
        if (!formData.legalType) {
            toast.show({ message: 'Please select legal business type', type: 'error', style: 'top' });
            return;
        }
        if (!formData.fullName.trim()) {
            toast.show({ message: 'Please enter full name', type: 'error', style: 'top' });
            return;
        }
        if (!formData.contactEmail.trim()) {
            toast.show({ message: 'Please enter contact email', type: 'error', style: 'top' });
            return;
        }
        if (!formData.contactPhone.trim()) {
            toast.show({ message: 'Please enter contact phone', type: 'error', style: 'top' });
            return;
        }
        if (formData.categories.length === 0) {
            toast.show({ message: 'Please select at least one product category', type: 'error', style: 'top' });
            return;
        }
        if (!formData.skuCount) {
            toast.show({ message: 'Please select SKU count', type: 'error', style: 'top' });
            return;
        }
        if (!formData.priceMin || !formData.priceMax) {
            toast.show({ message: 'Please enter price range', type: 'error', style: 'top' });
            return;
        }
        if (formData.productTypes.length === 0) {
            toast.show({ message: 'Please select product condition', type: 'error', style: 'top' });
            return;
        }
        if (!formData.inventoryOwnership) {
            toast.show({ message: 'Please select inventory ownership', type: 'error', style: 'top' });
            return;
        }
        if (formData.fulfillmentMethods.length === 0) {
            toast.show({ message: 'Please select fulfillment method', type: 'error', style: 'top' });
            return;
        }
        if (formData.shippingRegions.length === 0) {
            toast.show({ message: 'Please select shipping regions', type: 'error', style: 'top' });
            return;
        }
        if (!formData.returnPolicyText.trim() || formData.returnPolicyText.length < 50) {
            toast.show({ message: 'Please enter return policy (minimum 50 characters)', type: 'error', style: 'top' });
            return;
        }
        if (!formData.idDocument) {
            toast.show({ message: 'Please upload ID document', type: 'error', style: 'top' });
            return;
        }
        if (!formData.businessLicense) {
            toast.show({ message: 'Please upload business license', type: 'error', style: 'top' });
            return;
        }
        if (!formData.utilityBill) {
            toast.show({ message: 'Please upload utility bill', type: 'error', style: 'top' });
            return;
        }
        if (!formData.signatureName.trim()) {
            toast.show({ message: 'Please enter your signature', type: 'error', style: 'top' });
            return;
        }

        const allCompliant = COMPLIANCE_ITEMS.every((item) => formData.complianceChecks[item.key]);
        if (!allCompliant) {
            toast.show({ message: 'Please accept all compliance agreements', type: 'error', style: 'top' });
            return;
        }
        if (!formData.prohibitedAgreement) {
            toast.show({ message: 'Please accept the prohibited items policy', type: 'error', style: 'top' });
            return;
        }
        const allCertified = CERTIFICATION_ITEMS.every((item) => formData.certifications[item.key]);
        if (!allCertified) {
            toast.show({ message: 'Please complete all certifications', type: 'error', style: 'top' });
            return;
        }

        try {
            setSubmitting(true);
            const form = new FormData();

            // ─── Business Details ────────────────────────────────────────────────
            form.append('trade_name', formData.tradeName);
            form.append('legal_business_type', formData.legalType);
            form.append('business_reg_number', formData.registrationNumber);

            // ─── Primary Contact ─────────────────────────────────────────────────
            form.append('contact_full_name', formData.fullName);
            form.append('job_title', formData.jobTitle);
            form.append('contact_email', formData.contactEmail);
            form.append('contact_phone', formData.contactPhone);

            // ─── Product Catalog ─────────────────────────────────────────────────
            // ✅ Send category names (not IDs)
            // Website sends each category as separate "category_names" field
            const allCategories = [...formData.categories];
            if (formData.otherCategory && !allCategories.includes(formData.otherCategory)) {
                allCategories.push(formData.otherCategory);
            }
            allCategories.forEach((category) => {
                form.append('category_names', category);
            });

            form.append('estimated_sku_count', formData.skuCount);
            form.append('min_price', formData.priceMin);
            form.append('max_price', formData.priceMax);
            form.append('product_conditions', JSON.stringify(formData.productTypes));
            form.append('owns_inventory', formData.inventoryOwnership === 'yes' ? 'true' : 'false');

            // ─── Fulfillment ─────────────────────────────────────────────────────
            form.append('fulfillment_methods', JSON.stringify(formData.fulfillmentMethods));
            form.append('shipping_regions', JSON.stringify(formData.shippingRegions));

            // ─── Return Policy ──────────────────────────────────────────────────
            form.append('return_policy_description', formData.returnPolicyText);
            if (formData.returnPolicyFile) {
                form.append('return_policy_document', {
                    uri: formData.returnPolicyFile.uri,
                    type: formData.returnPolicyFile.mimeType || 'application/octet-stream',
                    name: formData.returnPolicyFile.name || 'return_policy_document',
                } as any);
            }

            // ─── Compliance ──────────────────────────────────────────────────────
            const allCompliantChecked = COMPLIANCE_ITEMS.every((item) => formData.complianceChecks[item.key]);
            form.append('agreed_to_compliance', allCompliantChecked ? 'true' : 'false');

            // ─── Prohibited Items ───────────────────────────────────────────────
            form.append('agreed_to_prohibited_items', formData.prohibitedAgreement ? 'true' : 'false');

            // ─── Business History ───────────────────────────────────────────────
            form.append('has_prior_experience', formData.hasPriorHistory === 'yes' ? 'true' : 'false');
            if (formData.hasPriorHistory === 'yes') {
                form.append('experience_description', formData.historyExplanation);
            }

            // ─── Documents ──────────────────────────────────────────────────────
            if (formData.idDocument) {
                form.append('government_id', {
                    uri: formData.idDocument.uri,
                    type: formData.idDocument.mimeType || 'application/octet-stream',
                    name: formData.idDocument.name || 'government_id',
                } as any);
            }
            if (formData.businessLicense) {
                form.append('business_license', {
                    uri: formData.businessLicense.uri,
                    type: formData.businessLicense.mimeType || 'application/octet-stream',
                    name: formData.businessLicense.name || 'business_license',
                } as any);
            }
            if (formData.utilityBill) {
                form.append('utility_bill', {
                    uri: formData.utilityBill.uri,
                    type: formData.utilityBill.mimeType || 'application/octet-stream',
                    name: formData.utilityBill.name || 'utility_bill',
                } as any);
            }

            // ─── Signature ──────────────────────────────────────────────────────
            form.append('digital_signature', formData.signatureName);

            // ─── Certifications ─────────────────────────────────────────────────
            const allCertifiedChecked = CERTIFICATION_ITEMS.every((item) => formData.certifications[item.key]);
            form.append('agreed_to_certifications', allCertifiedChecked ? 'true' : 'false');

            // ─── Send Request ──────────────────────────────────────────────────
            const res = await axios.post(`${API_BASE_URL}${END_POINTS}`, form, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (res.data?.success === true) {
                toast.show({
                    message: 'Shop application submitted successfully!',
                    type: 'success',
                    style: 'top',
                });
                navigation.goBack();
            } else {
                toast.show({
                    message: res.data?.message || 'Application failed',
                    type: 'error',
                    style: 'top',
                });
            }
        } catch (error: any) {
            console.error('Submit error:', error?.response?.data || error);
            toast.show({
                message: error?.response?.data?.message || 'Application failed',
                type: 'error',
                style: 'top',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return <Step1BusinessDetails data={formData} onChange={updateForm} />;
            case 2:
                return <Step2PrimaryContact data={formData} onChange={updateForm} />;
            case 3:
                return <Step3ProductCatalog data={formData} onChange={updateForm} />;
            case 4:
                return <Step4Fulfillment data={formData} onChange={updateForm} />;
            case 5:
                return <Step5ReturnPolicy data={formData} onChange={updateForm} onFilePick={handleFilePick} />;
            case 6:
                return <Step6Compliance data={formData} onChange={updateForm} />;
            case 7:
                return <Step7ProhibitedItems data={formData} onChange={updateForm} />;
            case 8:
                return <Step8BusinessHistory data={formData} onChange={updateForm} onFilePick={handleFilePick} />;
            case 9:
                return <Step9Review data={formData} />;
            case 10:
                return <Step10Signature data={formData} onChange={updateForm} />;
            case 11:
                return <Step11Certification data={formData} onChange={updateForm} onSubmit={handleSubmit} submitting={submitting} />;
            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={styles.header}>
                    <View style={styles.headerRow}>
                        <AppHeader left={() => <BackButton />} />
                        <Text style={styles.headerTitle}>Apply as Seller</Text>
                    </View>
                </View>

                <StepIndicator currentStep={currentStep} />

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                >
                    {renderStep()}
                </ScrollView>

                {currentStep < 11 && (
                    <View style={styles.footer}>
                        {currentStep > 1 && (
                            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                                <Text style={styles.backButtonText}>Back</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={handleNext}
                            style={[styles.continueButton, currentStep === 1 && styles.continueButtonFull]}
                        >
                            <Text style={styles.continueButtonText}>
                                {currentStep === 10 ? 'Review & Submit' : 'Continue'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </KeyboardAvoidingView>

            <Toast
                style={toast.style}
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                fadeAnim={toast.fadeAnim}
                buttons={toast.buttons}
                onHide={toast.hide}
            />
        </SafeAreaView>
    );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F9F9FB',
    },
    container: {
        flex: 1,
        paddingHorizontal: 20,
    },
    header: {
        paddingVertical: 8,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    scrollView: {
        flex: 1,
        marginTop: 8,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        paddingVertical: 16,
        backgroundColor: '#F9F9FB',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    backButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        alignItems: 'center',
    },
    backButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#4B5563',
    },
    continueButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#2355B6',
        alignItems: 'center',
    },
    continueButtonFull: {
        flex: 1,
    },
    continueButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },

    // Step Components Styles
    stepContainer: {
        paddingVertical: 8,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainerRed: {
        backgroundColor: '#FEF2F2',
    },
    stepTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
    },
    stepSubtitle: {
        fontSize: 14,
        color: '#6B7280',
    },
    inputGroup: {
        marginTop: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 6,
    },
    required: {
        color: '#EF4444',
    },
    optional: {
        color: '#9CA3AF',
        fontWeight: '400',
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#111827',
    },
    textArea: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#111827',
        minHeight: 120,
        textAlignVertical: 'top',
    },
    hintText: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 4,
    },
    chipScroll: {
        flexDirection: 'row',
        marginTop: 4,
    },
    chipWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 4,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        marginRight: 8,
        marginBottom: 8,
    },
    chipActive: {
        borderColor: '#2355B6',
        backgroundColor: '#EFF6FF',
    },
    chipText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },
    chipTextActive: {
        color: '#2355B6',
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    halfInput: {
        flex: 1,
    },
    mr2: {
        marginRight: 6,
    },
    mt2: {
        marginTop: 8,
    },
    priceInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 12,
    },
    priceSymbol: {
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '600',
        marginRight: 4,
    },
    priceInputField: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: '#111827',
    },
    halfButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
    },
    halfButtonActive: {
        borderColor: '#2355B6',
        backgroundColor: '#EFF6FF',
    },
    halfButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
    },
    halfButtonTextActive: {
        color: '#2355B6',
    },
    checkCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        marginBottom: 8,
        gap: 12,
    },
    checkCardActive: {
        borderColor: '#2355B6',
        backgroundColor: '#EFF6FF',
    },
    checkCardContent: {
        flex: 1,
    },
    checkCardLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#4B5563',
    },
    checkCardLabelActive: {
        color: '#2355B6',
    },
    checkCardLabelLarge: {
        fontSize: 13,
        lineHeight: 20,
        flex: 1,
        flexWrap: 'wrap',
    },
    checkCardDesc: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 1,
    },
    checkboxActive: {
        borderColor: '#2355B6',
        backgroundColor: '#2355B6',
    },
    infoBox: {
        borderRadius: 12,
        padding: 16,
        marginTop: 12,
        backgroundColor: '#FEFCE8',
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    infoBoxLight: {
        backgroundColor: '#F9FAFB',
        borderColor: '#E5E7EB',
    },
    infoBoxAmber: {
        backgroundColor: '#FFFBEB',
        borderColor: '#FDE68A',
    },
    infoBoxBlue: {
        backgroundColor: '#EFF6FF',
        borderColor: '#BFDBFE',
    },
    infoBoxRed: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FECACA',
    },
    infoBoxText: {
        fontSize: 14,
        color: '#92400E',
        lineHeight: 20,
    },
    infoBoxTextLight: {
        color: '#6B7280',
    },
    infoBoxTextAmber: {
        color: '#92400E',
    },
    infoBoxTextBlue: {
        color: '#1E40AF',
    },
    infoBoxTextRed: {
        color: '#991B1B',
    },
    characterCount: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    charCount: {
        fontSize: 12,
        fontWeight: '500',
    },
    charCountWarning: {
        color: '#EF4444',
    },
    charCountSuccess: {
        color: '#16A34A',
    },
    fileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#F0FDF4',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#BBF7D0',
        gap: 12,
        marginTop: 8,
    },
    fileInfo: {
        flex: 1,
    },
    fileName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#166534',
    },
    fileSize: {
        fontSize: 12,
        color: '#15803D',
    },
    uploadArea: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
        borderRadius: 12,
        marginTop: 8,
        backgroundColor: '#FFFFFF',
    },
    uploadText: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 8,
    },
    uploadSubtext: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 4,
    },
    complianceFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    complianceCount: {
        fontSize: 14,
        color: '#6B7280',
    },
    acceptAll: {
        fontSize: 14,
        color: '#2355B6',
        fontWeight: '600',
    },
    certRequired: {
        fontSize: 12,
        color: '#EF4444',
    },
    prohibitedList: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        marginTop: 4,
        maxHeight: 260,
    },
    prohibitedHeader: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        backgroundColor: '#F9FAFB',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    prohibitedHeaderText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    prohibitedScroll: {
        maxHeight: 220,
    },
    prohibitedItem: {
        flexDirection: 'row',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        gap: 12,
    },
    prohibitedIcon: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#FEE2E2',
        color: '#DC2626',
        textAlign: 'center',
        fontSize: 10,
        fontWeight: '700',
        lineHeight: 20,
    },
    prohibitedText: {
        flex: 1,
        fontSize: 13,
        color: '#4B5563',
        lineHeight: 20,
    },
    sectionLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 4,
    },
    docGroup: {
        marginTop: 12,
    },
    docLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
    },
    docHint: {
        fontSize: 12,
        color: '#9CA3AF',
        marginBottom: 4,
    },
    signatureInput: {
        fontSize: 18,
        fontFamily: Platform.OS === 'ios' ? 'Zapfino' : 'cursive',
        color: '#1F2937',
    },
    signaturePreview: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#F0FDF4',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#BBF7D0',
        gap: 12,
        marginTop: 8,
    },
    signatureCheck: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#D1FAE5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    signaturePreviewLabel: {
        fontSize: 12,
        color: '#065F46',
        fontWeight: '600',
    },
    signaturePreviewText: {
        fontSize: 16,
        color: '#065F46',
        fontFamily: Platform.OS === 'ios' ? 'Zapfino' : 'cursive',
    },
    submitButton: {
        paddingVertical: 16,
        borderRadius: 12,
        backgroundColor: '#2355B6',
        alignItems: 'center',
        marginTop: 8,
    },
    submitButtonDisabled: {
        backgroundColor: '#9CA3AF',
        opacity: 0.5,
    },
    submitLoading: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    // Step Indicator Styles
    indicatorContainer: {
        marginTop: 8,
        marginBottom: 4,
    },
    indicatorRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    indicatorStep: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2355B6',
    },
    indicatorDesc: {
        fontSize: 14,
        color: '#6B7280',
    },
    progressBar: {
        width: '100%',
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#2355B6',
        borderRadius: 2,
    },

    // Review Section Styles
    reviewSection: {
        borderWidth: 1,
        borderColor: '#F3F4F6',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 12,
        backgroundColor: '#FFFFFF',
    },
    reviewSectionHeader: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        backgroundColor: '#F9FAFB',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    reviewSectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4B5563',
    },
    reviewSectionContent: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    reviewRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#F9FAFB',
    },
    reviewLabel: {
        fontSize: 12,
        color: '#9CA3AF',
        width: 120,
    },
    reviewValue: {
        fontSize: 13,
        color: '#1F2937',
        fontWeight: '500',
        flex: 1,
        textAlign: 'right',
    },
    reviewEmpty: {
        color: '#9CA3AF',
        fontWeight: '400',
    },
});

export default ShopCreate;