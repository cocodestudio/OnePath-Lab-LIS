<?php

namespace App\Http\Controllers\Api\Lis;

use App\Http\Controllers\Controller;
use App\Models\Test;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TestController extends Controller
{
    public function index(Request $request)
    {
        $tests = Test::where('lab_id', $request->user()->lab_id)
            ->whereNull('parent_id')
            ->with('subTests')
            ->get();
            
        return response()->json($tests);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'category' => 'required|string',
            'subTests' => 'array',
        ]);

        $labId = $request->user()->lab_id;

        DB::beginTransaction();
        try {
            $data = $request->except(['subTests']);
            $data['lab_id'] = $labId;
            
            $test = Test::create($data);

            if (!empty($request->subTests)) {
                foreach ($request->subTests as $sub) {
                    $sub['lab_id'] = $labId;
                    $sub['parent_id'] = $test->id;
                    Test::create($sub);
                }
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
        $test = Test::where('lab_id', $request->user()->lab_id)
            ->with('subTests')
            ->findOrFail($id);
            
        return response()->json($test);
    }

    public function update(Request $request, string $id)
    {
        $test = Test::where('lab_id', $request->user()->lab_id)->findOrFail($id);
        $test->update($request->all());
        return response()->json($test);
    }

    public function destroy(Request $request, string $id)
    {
        $test = Test::where('lab_id', $request->user()->lab_id)->findOrFail($id);
        $test->delete();
        return response()->json(['success' => true]);
    }
}
