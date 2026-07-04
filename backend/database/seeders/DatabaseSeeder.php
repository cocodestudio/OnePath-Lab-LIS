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

        // 3. Create some Tests
        $cbc = \App\Models\Test::firstOrCreate([
            'lab_id' => $lab->id,
            'name' => 'Complete Blood Count (CBC)',
            'category' => 'Hematology',
            'type' => 'Pathology',
            'field_type' => 'Multiple Field',
            'price' => 500,
        ]);

        $hb = \App\Models\Test::firstOrCreate([
            'lab_id' => $lab->id,
            'parent_id' => $cbc->id,
            'name' => 'Hemoglobin (Hb)',
            'category' => 'Hematology',
            'type' => 'Pathology',
            'field_type' => 'Single Field',
            'unit' => 'g/dL',
            'gender_ref_type' => 'GENDER_SPECIFIC',
            'ref_range_min_male' => 13.8,
            'ref_range_max_male' => 17.2,
            'ref_range_min_female' => 12.1,
            'ref_range_max_female' => 15.1,
            'ref_range_min_child' => 11.0,
            'ref_range_max_child' => 16.0,
            'ref_range_min_newborn' => 14.0,
            'ref_range_max_newborn' => 24.0,
        ]);

        $wbc = \App\Models\Test::firstOrCreate([
            'lab_id' => $lab->id,
            'parent_id' => $cbc->id,
            'name' => 'Total WBC Count',
            'category' => 'Hematology',
            'type' => 'Pathology',
            'field_type' => 'Single Field',
            'unit' => 'cells/cumm',
            'gender_ref_type' => 'BOTH',
            'ref_range_min' => 4500,
            'ref_range_max' => 11000,
        ]);

        $lft = \App\Models\Test::firstOrCreate([
            'lab_id' => $lab->id,
            'name' => 'Liver Function Test (LFT)',
            'category' => 'Biochemistry',
            'field_type' => 'Multiple Field',
            'type' => 'Pathology',
            'price' => 800,
        ]);

        $bili = \App\Models\Test::firstOrCreate([
            'lab_id' => $lab->id,
            'parent_id' => $lft->id,
            'name' => 'Bilirubin Total',
            'category' => 'Biochemistry',
            'type' => 'Pathology',
            'field_type' => 'Single Field',
            'unit' => 'mg/dL',
            'gender_ref_type' => 'BOTH',
            'ref_range_min' => 0.1,
            'ref_range_max' => 1.2,
        ]);

        $sgpt = \App\Models\Test::firstOrCreate([
            'lab_id' => $lab->id,
            'parent_id' => $lft->id,
            'name' => 'SGPT / ALT',
            'category' => 'Biochemistry',
            'type' => 'Pathology',
            'field_type' => 'Single Field',
            'unit' => 'U/L',
            'gender_ref_type' => 'GENDER_SPECIFIC',
            'ref_range_min_male' => 7,
            'ref_range_max_male' => 55,
            'ref_range_min_female' => 7,
            'ref_range_max_female' => 45,
        ]);

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

            \App\Models\ReportTest::create([
                'report_id' => $report->id,
                'test_id' => $bili->id,
                'result_value' => null,
                'is_abnormal' => false,
            ]);
            
            \App\Models\ReportTest::create([
                'report_id' => $report->id,
                'test_id' => $sgpt->id,
                'result_value' => null,
                'is_abnormal' => false,
            ]);
        }
    }
}