<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create a Test Lab
        $lab = \App\Models\Lab::firstOrCreate(
            ['email' => 'admin@onepath.in'],
            [
                'name' => 'OnePath Demo Lab',
                'address' => '123 Health Street, Medical District',
                'print_header_height' => 40,
                'print_footer_height' => 40,
            ]
        );

        // 2. Create an Admin User for this Lab
        $user = User::firstOrCreate(
            ['email' => 'admin@onepath.in'],
            [
                'name' => 'Admin User',
                'phone' => '9876543210',
                'lab_name' => 'OnePath Demo Lab',
                'patient_count' => '51-200',
                'password' => Hash::make('password123'), 
                'lab_id' => $lab->id,
                'role' => 'ADMIN',
                'status' => 'active'
            ]
        );

        $jsonTests = json_decode(file_get_contents(database_path('data/default_tests.json')), true);
        $cbcData = $jsonTests[0]; // CBC
        
        $cbc = \App\Models\Test::create([
            'lab_id' => $lab->id,
            'test_code' => $cbcData['testCode'],
            'is_json_override' => true,
            'name' => $cbcData['name'],
            'category' => $cbcData['category'],
            'field_type' => $cbcData['fieldType'] ?? 'Single Field',
            'type' => $cbcData['type'] ?? 'Pathology',
            'price' => $cbcData['price'] ?? 0,
            'gender_ref_type' => $cbcData['genderRefType'] ?? 'BOTH',
            'value_type' => $cbcData['valueType'] ?? 'Numeric'
        ]);
        
        $hb = null; $wbc = null;
        foreach ($cbcData['subTests'] as $sub) {
            $createdSub = \App\Models\Test::create([
                'lab_id' => $lab->id,
                'parent_id' => $cbc->id,
                'test_code' => $sub['testCode'],
                'name' => $sub['name'],
                'category' => $sub['category'],
                'field_type' => $sub['fieldType'] ?? 'Single Field',
                'type' => $sub['type'] ?? 'Pathology',
                'gender_ref_type' => $sub['genderRefType'] ?? 'BOTH',
                'value_type' => $sub['valueType'] ?? 'Numeric',
                'unit' => $sub['unit'] ?? null,
                'ref_range_min' => $sub['refRangeMin'] ?? null,
                'ref_range_max' => $sub['refRangeMax'] ?? null,
                'ref_range_min_male' => $sub['refRangeMinMale'] ?? null,
                'ref_range_max_male' => $sub['refRangeMaxMale'] ?? null,
                'ref_range_min_female' => $sub['refRangeMinFemale'] ?? null,
                'ref_range_max_female' => $sub['refRangeMaxFemale'] ?? null,
                'ref_range_min_child' => $sub['refRangeMinChild'] ?? null,
                'ref_range_max_child' => $sub['refRangeMaxChild'] ?? null,
                'ref_range_min_newborn' => $sub['refRangeMinNewborn'] ?? null,
                'ref_range_max_newborn' => $sub['refRangeMaxNewborn'] ?? null,
            ]);
            if ($createdSub->test_code === 'SYS_CBC_01_HB') $hb = $createdSub;
            if ($createdSub->test_code === 'SYS_CBC_01_WBC') $wbc = $createdSub;
        }

        // 4. Create Patients and Reports
        for ($i = 1; $i <= 5; $i++) {
            $patient = \App\Models\Patient::create([
                'custom_id' => 'LAB-2026-000' . $i,
                'lab_id' => $lab->id,
                'name' => 'Test Patient ' . $i,
                'designation' => 'Mr.',
                'age' => 20 + $i * 5,
                'gender' => $i % 2 == 0 ? 'Female' : 'Male',
                'phone' => '987654321' . $i,
                'ref_doctor' => 'Dr. Smith',
            ]);

            $bill = \App\Models\Bill::create([
                'custom_id' => 'BILL-2026-000' . $i,
                'lab_id' => $lab->id,
                'patient_id' => $patient->id,
                'total' => 1300,
                'discount' => 0,
                'paid_amount' => 1300,
                'status' => 'PAID',
            ]);

            $report = \App\Models\Report::create([
                'custom_id' => 'REP-2026-000' . $i,
                'lab_id' => $lab->id,
                'bill_id' => $bill->id,
                'patient_id' => $patient->id,
                'status' => $i % 2 == 0 ? 'COMPLETED' : 'PENDING',
            ]);

            \App\Models\ReportTest::create([
                'report_id' => $report->id,
                'test_id' => $hb->id,
                'result_value' => $i % 2 == 0 ? '14.5' : null,
                'is_abnormal' => false,
            ]);

            \App\Models\ReportTest::create([
                'report_id' => $report->id,
                'test_id' => $wbc->id,
                'result_value' => null,
                'is_abnormal' => false,
            ]);
        }
    }
}