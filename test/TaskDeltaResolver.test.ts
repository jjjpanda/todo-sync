import TaskDeltaResolver from "../lib/TaskDeltaResolver"
import TaskList from "../lib/model/TaskList"
import TaskDelta from "../lib/model/TaskDelta"

describe("TaskDeltaResolver", () => {
    it("tests simple addition resolution of task list", () => {
        const delta = TaskDeltaResolver.getTaskListDeltas(
            [
                {
                    name: "taskList1",
                } 
            ] as TaskList[],
            [
                {
                    name: "taskList2",
                    id: "taskList2ID"
                }
            ] as TaskList[]
        )

        expect(delta.toOrigin.add).toHaveLength(1)
        expect(delta.toOrigin.add![0]).not.toBeNull()
        expect(delta.toOrigin.add![0].name).toBe("taskList2")
        expect(delta.toOrigin.add![0].id).toBe("taskList2ID")
        expect(delta.toOrigin.add![0].tasks).toBeNull()

        expect(delta.toRemote.add).toHaveLength(1)
        expect(delta.toRemote.add![0]).not.toBeNull()
        expect(delta.toRemote.add![0].name).toBe("taskList1")
        expect(delta.toRemote.add![0].tasks).toBeNull()
    })
})