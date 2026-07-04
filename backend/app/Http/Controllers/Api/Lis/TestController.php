<?php

namespace App\Http\Controllers\Api\Lis;

use App\Http\Controllers\Controller;
use App\Models\Test;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TestController extends Controller
{
    public function index(Request $request)
    {
        $labId = $request->user()->lab_id;

        // 1. Get DB Tests
        $dbTests = Test::where('lab_id', $labId)
            ->whereNull('parent_id')
            ->with('subTests')
            ->get();
            
        // 2. Get JSON Tests
        $jsonPath = database_path('data/default_tests.json');
        $jsonTests = [];
        if (file_exists($jsonPath)) {
            $jsonTests = json_decode(file_get_contents($jsonPath), true);
        }

        // 3. Map DB tests by test_code
        $dbTestsMap = [];
        foreach ($dbTests as $dbTest) {
            if ($dbTest->test_code) {
                $dbTestsMap[$dbTest->test_code] = $dbTest;
            }
        }

        // 4. Merge
        $mergedTests = [];
        foreach ($jsonTests as $jsonTest) {
            $code = $jsonTest['testCode'] ?? null;
            if ($code && isset($dbTestsMap[$code])) {
                $mergedTests[] = $dbTestsMap[$code];
                unset($dbTestsMap[$code]); // mark as processed
            } else {
                if ($code) {
                    $jsonTest['id'] = $code; // So frontend can edit it
                    if (isset($jsonTest['subTests']) && is_array($jsonTest['subTests'])) {
                        foreach ($jsonTest['subTests'] as &$sub) {
                            if (isset($sub['testCode'])) $sub['id'] = $sub['testCode'];
                            if (isset($sub['subTests']) && is_array($sub['subTests'])) {
                                foreach ($sub['subTests'] as &$subsub) {
                                    if (isset($subsub['testCode'])) $subsub['id'] = $subsub['testCode'];
                                }
                            }
                        }
                    }
                    $mergedTests[] = $jsonTest;
                }
            }
        }

        // 5. Append any custom tests created by user that are not in JSON
        foreach ($dbTests as $dbTest) {
            if (!$dbTest->test_code || isset($dbTestsMap[$dbTest->test_code])) {
                $mergedTests[] = $dbTest;
            }
        }

        return response()->json($mergedTests);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'category' => 'required|string',
            'sub_tests' => 'array',
        ]);

        $labId = $request->user()->lab_id;

        DB::beginTransaction();
        try {
            $data = $request->except(['sub_tests']);
            $data['lab_id'] = $labId;
            // For custom tests, generate a random code if not provided
            if (empty($data['test_code'])) {
                $data['test_code'] = 'CUSTOM_' . strtoupper(Str::random(8));
            }
            
            $test = Test::create($data);

            if (!empty($request->sub_tests)) {
                $this->saveSubTests($request->sub_tests, $test->id, $labId);
            }

            DB::commit();
            return response()->json($test->load('subTests'), 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function show(Request $request, string $id)
    {
        // For JSON tests, we shouldn't really call show(), but if we do, we need to handle it.
        // It's better to fetch from DB for now.
        $test = Test::where('lab_id', $request->user()->lab_id)
            ->with('subTests')
            ->findOrFail($id);
            
        return response()->json($test);
    }

    public function update(Request $request, string $id)
    {
        $labId = $request->user()->lab_id;

        // If $id is NOT a UUID, it means it's a JSON override request
        if (!Str::isUuid($id)) {
            $existing = Test::where('lab_id', $labId)->where('test_code', $id)->first();
            if ($existing) {
                $id = $existing->id;
            } else {
                return $this->storeJsonOverride($request, $id);
            }
        }

        DB::beginTransaction();
        try {
            $test = Test::where('lab_id', $labId)->findOrFail($id);
            $test->update($request->except(['sub_tests']));

            if ($request->has('sub_tests')) {
                // Delete existing sub tests completely
                $test->subTests()->delete(); // assuming this cascades or we don't have deeply nested orphans
                $this->saveSubTests($request->sub_tests, $test->id, $labId);
            }

            DB::commit();
            return response()->json($test->load('subTests'));
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, string $id)
    {
        $test = Test::where('lab_id', $request->user()->lab_id)->findOrFail($id);
        $test->delete();
        return response()->json(['success' => true]);
    }

    private function storeJsonOverride(Request $request, string $testCode)
    {
        $labId = $request->user()->lab_id;

        DB::beginTransaction();
        try {
            $data = $request->except(['sub_tests']);
            $data['lab_id'] = $labId;
            $data['test_code'] = $testCode;
            $data['is_json_override'] = true;
            
            $test = Test::create($data);

            if (!empty($request->sub_tests)) {
                $this->saveSubTests($request->sub_tests, $test->id, $labId);
            }

            DB::commit();
            return response()->json($test->load('subTests'), 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    private function saveSubTests(array $subTests, string $parentId, string $labId)
    {
        foreach ($subTests as $sub) {
            $sub['lab_id'] = $labId;
            $sub['parent_id'] = $parentId;
            
            $subSubTests = $sub['sub_tests'] ?? [];
            unset($sub['sub_tests']);
            $newSub = Test::create($sub);

            if (!empty($subSubTests)) {
                foreach ($subSubTests as $ss) {
                    $ss['lab_id'] = $labId;
                    $ss['parent_id'] = $newSub->id;
                    Test::create($ss);
                }
            }
        }
    }
}
