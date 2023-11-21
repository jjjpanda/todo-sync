import DeltaResolver from "../lib/util/DeltaResolver"
import TaskList from "../lib/model/TaskList"
import Task from "../lib/model/Task"

describe("DeltaResolver", () => {
    describe("TaskList", () => {
        it("tests simple addition resolution of task list", () => {
            const delta = DeltaResolver.getTaskListDeltas(
                [
                    TaskList.from({
                        name: "taskList1",
                    }) 
                ] as TaskList[],
                [
                    TaskList.from({
                        name: "taskList2",
                        id: "taskList2ID"
                    })
                ] as TaskList[]
            )
    
            expect(delta.toOrigin.add).toHaveLength(1)
            expect(delta.toOrigin.modify).toHaveLength(0)
            expect(delta.toOrigin.removeID).toHaveLength(0)

            expect(delta.toOrigin.add[0]).not.toBeNull()
            expect(delta.toOrigin.add[0].name).toBe("taskList2")
            expect(delta.toOrigin.add[0].id).toBe("taskList2ID")
            expect(delta.toOrigin.add[0].tasks).toHaveLength(0)
    
            expect(delta.toRemote.add).toHaveLength(1)
            expect(delta.toRemote.modify).toHaveLength(0)
            expect(delta.toRemote.delete).toHaveLength(0)

            expect(delta.toRemote.add[0]).not.toBeNull()
            expect(delta.toRemote.add[0].name).toBe("taskList1")
            expect(delta.toRemote.add[0].tasks).toHaveLength(0)
        })
    
        it("tests modification of task list", () => {
            const delta = DeltaResolver.getTaskListDeltas(
                [
                    TaskList.from({
                        name: "taskList1", 
                        id: "taskListID",
                        modifiedTime: 0
                    })
                ] as TaskList[],
                [
                    TaskList.from({
                        name: "taskList2",
                        id: "taskListID",
                        modifiedTime: 1
                    })
                ] as TaskList[]
            )
    
            expect(delta.toOrigin.add).toHaveLength(0)
            expect(delta.toOrigin.modify).toHaveLength(1)
            expect(delta.toOrigin.removeID).toHaveLength(0)
            
            expect(delta.toOrigin.modify[0]).not.toBeNull()
            expect(delta.toOrigin.modify[0].name).toBe("taskList2")
            expect(delta.toOrigin.modify[0].id).toBe("taskListID")
            expect(delta.toOrigin.modify[0].tasks).toHaveLength(0)
    
            expect(delta.toRemote.add).toHaveLength(0)
            expect(delta.toRemote.modify).toHaveLength(0)
            expect(delta.toRemote.delete).toHaveLength(0)
        })

        it("tests delete of task list", () => {
            const delta = DeltaResolver.getTaskListDeltas(
                [
                    
                ] as TaskList[],
                [
                    TaskList.from({
                        name: "taskList",
                        id: "taskListID",
                        modifiedTime: 1
                    }),
                    TaskList.from({
                        name: "taskList2",
                        id: "taskListID2"
                    })
                ] as TaskList[],
                {
                    toOrigin: {
                        add: [],
                        modify: [],
                        removeID: []
                    },
                    toRemote: {
                        add: [],
                        modify: [],
                        delete: [
                            TaskList.from({
                                name: "taskList",
                                id: "taskListID",
                                modifiedTime: 1
                            })
                        ] 
                    }
                }
            )
    
            expect(delta.toOrigin.add).toHaveLength(1)
            expect(delta.toOrigin.modify).toHaveLength(0)
            expect(delta.toOrigin.removeID).toHaveLength(0)

            expect(delta.toOrigin.add[0]).not.toBeNull()
            expect(delta.toOrigin.add[0].name).toBe("taskList2")
            expect(delta.toOrigin.add[0].id).toBe("taskListID2")
            expect(delta.toOrigin.add[0].tasks).toHaveLength(0)
    
            expect(delta.toRemote.add).toHaveLength(0)
            expect(delta.toRemote.modify).toHaveLength(0)
            expect(delta.toRemote.delete).toHaveLength(1)

            expect(delta.toRemote.delete[0]).not.toBeNull()
            expect(delta.toRemote.delete[0].name).toBe("taskList")
            expect(delta.toRemote.delete[0].id).toBe("taskListID")
            expect(delta.toRemote.delete[0].tasks).toHaveLength(0)
        })
    })

    describe("Task", () => {
        it("tests simple addition resolution of task", () => {
            const delta = DeltaResolver.getTaskDeltas(
                [
                    Task.from({
                        title: "title1"
                    })
                ] as Task[],
                [
                    Task.from({
                        id: "id_1", 
                        title: "title1"
                    })
                ] as Task[]
            )
    
            expect(delta.toOrigin.add).toHaveLength(1)
            expect(delta.toOrigin.modify).toHaveLength(0)
            expect(delta.toOrigin.removeID).toHaveLength(0)

            expect(delta.toOrigin.add[0]).not.toBeNull()
            expect(delta.toOrigin.add[0].title).toBe("title1")
            expect(delta.toOrigin.add[0].id).toBe("id_1")
    
            expect(delta.toRemote.add).toHaveLength(1)
            expect(delta.toRemote.modify).toHaveLength(0)
            expect(delta.toRemote.delete).toHaveLength(0)

            expect(delta.toRemote.add[0]).not.toBeNull()
            expect(delta.toRemote.add[0].title).toBe("title1")
        })

        it("tests simple modification resolution of task", () => {
            const delta = DeltaResolver.getTaskDeltas(
                [
                    Task.from({
                        id: "id",
                        title: "title1",
                        modifiedTime: 0
                    })
                ] as Task[],
                [
                    Task.from({
                        id: "id", 
                        title: "title2",
                        modifiedTime: 1
                    })
                ] as Task[]
            )
    
            expect(delta.toOrigin.add).toHaveLength(0)
            expect(delta.toOrigin.modify).toHaveLength(1)
            expect(delta.toOrigin.removeID).toHaveLength(0)

            expect(delta.toOrigin.modify[0]).not.toBeNull()
            expect(delta.toOrigin.modify[0].title).toBe("title2")
            expect(delta.toOrigin.modify[0].id).toBe("id")
    
            expect(delta.toRemote.add).toHaveLength(0)
            expect(delta.toRemote.modify).toHaveLength(0)
            expect(delta.toRemote.delete).toHaveLength(0)
        })

        it("tests simple delete resolution of task", () => {
            const delta = DeltaResolver.getTaskDeltas(
                [
                    Task.from({
                        title: "additionalTaskTitle"
                    })
                ] as Task[],
                [
                    Task.from({
                        id: "id", 
                        title: "title"
                    })
                ] as Task[],
                {
                    toOrigin: {
                        add: [],
                        modify: [],
                        removeID: []
                    },
                    toRemote: {
                        add: [],
                        modify: [],
                        delete: [
                            Task.from({
                                title: "title",
                                id: "id"
                            })
                        ]
                    }
                }
            )
    
            expect(delta.toOrigin.add).toHaveLength(0)
            expect(delta.toOrigin.modify).toHaveLength(0)
            expect(delta.toOrigin.removeID).toHaveLength(0)

            expect(delta.toRemote.add).toHaveLength(1)
            expect(delta.toRemote.modify).toHaveLength(0)
            expect(delta.toRemote.delete).toHaveLength(1)

            expect(delta.toRemote.add[0]).not.toBeNull()
            expect(delta.toRemote.add[0].title).toBe("additionalTaskTitle")

            expect(delta.toRemote.delete[0]).not.toBeNull()
            expect(delta.toRemote.delete[0].title).toBe("title")
            expect(delta.toRemote.delete[0].id).toBe("id")
        })
    })
})